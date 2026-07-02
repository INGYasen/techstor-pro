package com.upeu.pago.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.upeu.pago.config.MercadoPagoProperties;
import com.upeu.pago.dto.MercadoPagoConfigResponse;
import com.upeu.pago.dto.MercadoPagoTarjetaRequest;
import com.upeu.pago.dto.MercadoPagoYapeRequest;
import com.upeu.pago.dto.MercadoPagoYapeResponse;
import com.upeu.pago.dto.PedidoDto;
import com.upeu.pago.entity.Pago;
import com.upeu.pago.exception.ResourceNotFoundException;
import com.upeu.pago.metrics.TechStoreBusinessMetrics;
import com.upeu.pago.metrics.TechStoreSalesMetrics;
import com.upeu.pago.client.PedidoClient;
import com.upeu.pago.repository.PagoRepository;
import com.upeu.pago.service.MercadoPagoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MercadoPagoServiceImpl implements MercadoPagoService {

	private static final String PAYMENTS_URL = "https://api.mercadopago.com/v1/payments";
	private static final BigDecimal MONTO_MINIMO = new BigDecimal("2.00");

	private final MercadoPagoProperties properties;
	private final PedidoClient pedidoClient;
	private final PagoRepository pagoRepository;
	private final TechStoreSalesMetrics salesMetrics;
	private final TechStoreBusinessMetrics businessMetrics;
	private final RestClient mercadoPagoRestClient;
	private final ObjectMapper objectMapper;

	@Override
	public MercadoPagoConfigResponse obtenerConfiguracion() {
		boolean configured = properties.isConfigured();
		return MercadoPagoConfigResponse.builder()
				.enabled(configured)
				.publicKey(configured ? properties.getPublicKey() : "")
				.build();
	}

	@Override
	@Transactional
	public MercadoPagoYapeResponse cobrarConYape(MercadoPagoYapeRequest request) {
		validarConfiguracion();
		PedidoDto pedido = validarPedido(request.getIdPedido());
		Pago pago = obtenerPago(request.getIdPedido());
		String email = resolverEmail(request.getPayerEmail());
		BigDecimal monto = validarMonto(pedido, pago, "Yape");

		Map<String, Object> body = new LinkedHashMap<>();
		body.put("transaction_amount", monto.doubleValue());
		body.put("token", request.getToken());
		body.put("description", "TechStore pedido #" + pedido.getId());
		body.put("payment_method_id", "yape");
		body.put("installments", 1);
		body.put("external_reference", "techstore-pedido-" + pedido.getId());
		body.put("payer", Map.of("email", email));

		return procesarCobro(pedido, pago, body, "YAPE", "Pago con Yape aprobado.");
	}

	@Override
	@Transactional
	public MercadoPagoYapeResponse cobrarConTarjeta(MercadoPagoTarjetaRequest request) {
		validarConfiguracion();
		PedidoDto pedido = validarPedido(request.getIdPedido());
		Pago pago = obtenerPago(request.getIdPedido());
		String email = resolverEmail(request.getPayerEmail());
		BigDecimal monto = validarMonto(pedido, pago, "tarjeta");
		int installments = request.getInstallments() != null && request.getInstallments() > 0
				? request.getInstallments()
				: 1;

		Map<String, Object> body = new LinkedHashMap<>();
		body.put("transaction_amount", monto.doubleValue());
		body.put("token", request.getToken());
		body.put("description", "TechStore pedido #" + pedido.getId());
		body.put("payment_method_id", request.getPaymentMethodId());
		body.put("installments", installments);
		body.put("external_reference", "techstore-pedido-" + pedido.getId());
		body.put("payer", Map.of("email", email));

		return procesarCobro(pedido, pago, body, "TARJETA", "Pago con tarjeta aprobado.");
	}

	private void validarConfiguracion() {
		if (!properties.isConfigured()) {
			throw new IllegalStateException(
					"Mercado Pago no está configurado. Define las credenciales TEST en pago-dev.yml");
		}
	}

	private Pago obtenerPago(Long idPedido) {
		return pagoRepository.findByIdPedido(idPedido)
				.orElseThrow(() -> new ResourceNotFoundException(
						"Pago para pedido " + idPedido + " no encontrado"));
	}

	private String resolverEmail(String payerEmail) {
		return payerEmail != null && !payerEmail.isBlank()
				? payerEmail.trim()
				: properties.getPayerEmail();
	}

	private BigDecimal validarMonto(PedidoDto pedido, Pago pago, String metodo) {
		BigDecimal monto = resolverMonto(pedido, pago);
		if (monto.compareTo(MONTO_MINIMO) < 0) {
			throw new IllegalArgumentException(
					"Mercado Pago no acepta montos menores a S/ 2 para " + metodo + ". Total del pedido: S/ " + monto);
		}
		return monto;
	}

	private MercadoPagoYapeResponse procesarCobro(
			PedidoDto pedido,
			Pago pago,
			Map<String, Object> body,
			String metodoPago,
			String mensajeExito) {
		JsonNode response = enviarPago(body);
		if (response.has("error") && !approvedResponse(response)) {
			String mpMessage = mensajeRechazo("", "", response);
			actualizarPagoLocal(pago, false, null, metodoPago);
			return MercadoPagoYapeResponse.builder()
					.approved(false)
					.status(textOrEmpty(response, "status"))
					.statusDetail(textOrEmpty(response, "message"))
					.idPedido(pedido.getId())
					.idPago(pago.getId())
					.message(mpMessage)
					.build();
		}

		String status = textOrEmpty(response, "status");
		String statusDetail = textOrEmpty(response, "status_detail");
		Long mpPaymentId = response.hasNonNull("id") ? response.get("id").asLong() : null;
		boolean approved = "approved".equalsIgnoreCase(status);

		actualizarPagoLocal(pago, approved, mpPaymentId, metodoPago);

		if (approved && mpPaymentId != null) {
			log.info("Pago Mercado Pago APROBADO id={} pedido={} metodo={}", mpPaymentId, pedido.getId(), metodoPago);
		}

		String message = approved
				? mensajeExito
				: mensajeRechazo(status, statusDetail, response);

		return MercadoPagoYapeResponse.builder()
				.approved(approved)
				.status(status)
				.statusDetail(statusDetail)
				.mercadoPagoPaymentId(mpPaymentId)
				.idPedido(pedido.getId())
				.idPago(pago.getId())
				.message(message)
				.build();
	}

	private PedidoDto validarPedido(Long idPedido) {
		try {
			PedidoDto pedido = pedidoClient.findById(idPedido);
			if (pedido == null) {
				throw new IllegalArgumentException("El pedido " + idPedido + " no existe");
			}
			return pedido;
		} catch (IllegalArgumentException ex) {
			throw ex;
		} catch (Exception ex) {
			log.warn("No se pudo validar el pedido {}: {}", idPedido, ex.getMessage());
			throw new IllegalArgumentException("El pedido " + idPedido + " no existe");
		}
	}

	private BigDecimal resolverMonto(PedidoDto pedido, Pago pago) {
		BigDecimal total = pedido.getTotal() != null ? pedido.getTotal() : pago.getMonto();
		if (total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
			throw new IllegalArgumentException("El monto del pedido no es válido para cobrar con Yape");
		}
		return total.setScale(2, RoundingMode.HALF_UP);
	}

	private boolean approvedResponse(JsonNode response) {
		return response.hasNonNull("status") && "approved".equalsIgnoreCase(response.get("status").asText());
	}

	private JsonNode enviarPago(Map<String, Object> body) {
		try {
			String raw = mercadoPagoRestClient.post()
					.uri(PAYMENTS_URL)
					.header("Authorization", "Bearer " + properties.getAccessToken())
					.header("X-Idempotency-Key", UUID.randomUUID().toString())
					.contentType(MediaType.APPLICATION_JSON)
					.body(body)
					.retrieve()
					.body(String.class);
			return objectMapper.readTree(raw != null ? raw : "{}");
		} catch (RestClientResponseException ex) {
			log.warn("Mercado Pago respondió {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
			try {
				return objectMapper.readTree(ex.getResponseBodyAsString());
			} catch (Exception parseEx) {
				throw new IllegalStateException("Error al procesar el pago con Mercado Pago: " + ex.getMessage());
			}
		} catch (Exception ex) {
			log.error("Error al llamar a Mercado Pago", ex);
			throw new IllegalStateException("No se pudo conectar con Mercado Pago: " + ex.getMessage());
		}
	}

	private void actualizarPagoLocal(Pago pago, boolean approved, Long mpPaymentId, String metodo) {
		boolean wasApproved = TechStoreBusinessMetrics.isApproved(pago.getEstado());
		pago.setMetodo(metodo);
		pago.setEstado(approved ? "APROBADO" : "RECHAZADO");
		pago.setReferenciaTransaccion(mpPaymentId != null ? "MP-" + mpPaymentId : "MP-RECHAZADO");
		if (approved && pago.getFechaPago() == null) {
			pago.setFechaPago(LocalDateTime.now());
		}
		Pago saved = pagoRepository.save(pago);
		if (!wasApproved && approved) {
			salesMetrics.recordApprovedSale(saved);
		}
		businessMetrics.refreshFromDatabase();
	}

	private String textOrEmpty(JsonNode node, String field) {
		return node.hasNonNull(field) ? node.get(field).asText() : "";
	}

	private String mensajeRechazo(String status, String statusDetail, JsonNode response) {
		if (response.has("cause") && response.get("cause").isArray() && !response.get("cause").isEmpty()) {
			JsonNode firstCause = response.get("cause").get(0);
			if (firstCause.hasNonNull("description")) {
				String causeDesc = firstCause.get("description").asText();
				if (!causeDesc.isBlank()) {
					return traducirRechazoMercadoPago(statusDetail, causeDesc);
				}
			}
		}
		if (response.has("message")) {
			return traducirRechazoMercadoPago(statusDetail, response.get("message").asText());
		}
		if (!statusDetail.isBlank()) {
			return traducirRechazoMercadoPago(statusDetail, "Pago no aprobado (" + status + ")");
		}
		return "Pago no aprobado. Estado: " + status;
	}

	private String traducirRechazoMercadoPago(String statusDetail, String fallback) {
		if (statusDetail == null || statusDetail.isBlank()) {
			return fallback;
		}
		return switch (statusDetail) {
			case "cc_rejected_bad_filled_security_code" ->
					"Código OTP inválido o expirado. Genera uno nuevo en Yape e intenta de inmediato.";
			case "cc_rejected_insufficient_amount" ->
					"Saldo insuficiente en Yape para este monto.";
			case "cc_rejected_call_for_authorize" ->
					"Yape rechazó la operación. Verifica Compras por internet en tu app Yape.";
			case "cc_rejected_max_attempts" ->
					"Demasiados intentos fallidos. Espera unos minutos e intenta con un OTP nuevo.";
			case "cc_rejected_other_reason" ->
					"Yape rechazó el pago. Revisa tu límite de Compras por internet.";
			default -> fallback + " (" + statusDetail + ")";
		};
	}
}
