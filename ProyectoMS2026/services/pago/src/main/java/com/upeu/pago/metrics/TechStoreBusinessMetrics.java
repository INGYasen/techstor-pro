package com.upeu.pago.metrics;

import com.upeu.pago.client.PedidoClient;
import com.upeu.pago.dto.PedidoDto;
import com.upeu.pago.dto.PedidoItemDto;
import com.upeu.pago.entity.Pago;
import com.upeu.pago.repository.PagoRepository;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Slf4j
public class TechStoreBusinessMetrics {

	private final PagoRepository pagoRepository;
	private final PedidoClient pedidoClient;
	private final MeterRegistry meterRegistry;

	private final AtomicReference<Double> ventasCompletadas = new AtomicReference<>(0.0);
	private final AtomicReference<Double> ingresosSoles = new AtomicReference<>(0.0);
	private final AtomicReference<Double> pagosPendientes = new AtomicReference<>(0.0);
	private final Map<String, AtomicReference<Double>> unidadesPorProducto = new ConcurrentHashMap<>();

	public TechStoreBusinessMetrics(
			PagoRepository pagoRepository,
			PedidoClient pedidoClient,
			MeterRegistry meterRegistry) {
		this.pagoRepository = pagoRepository;
		this.pedidoClient = pedidoClient;
		this.meterRegistry = meterRegistry;

		registerGauge("techstore.ventas.completadas", ventasCompletadas, "Ventas con pago aprobado");
		registerGauge("techstore.ingresos.soles", ingresosSoles, "Ingresos en soles (pagos aprobados)");
		registerGauge("techstore.pagos.pendientes", pagosPendientes, "Pagos pendientes de aprobación");
	}

	private void registerGauge(String name, AtomicReference<Double> ref, String description) {
		Gauge.builder(name, ref, AtomicReference::get)
				.description(description)
				.register(meterRegistry);
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onReady() {
		refreshFromDatabase();
	}

	@Scheduled(fixedRate = 10000, initialDelay = 3000)
	public void refreshFromDatabase() {
		try {
			List<Pago> pagos = pagoRepository.findAll();
			List<Pago> aprobados = pagos.stream().filter(p -> isApproved(p.getEstado())).toList();
			List<Pago> pendientes = pagos.stream()
					.filter(p -> "PENDIENTE".equalsIgnoreCase(p.getEstado()))
					.toList();

			ventasCompletadas.set((double) aprobados.size());
			pagosPendientes.set((double) pendientes.size());
			ingresosSoles.set(aprobados.stream()
					.map(Pago::getMonto)
					.filter(m -> m != null)
					.map(BigDecimal::doubleValue)
					.reduce(0.0, Double::sum));

			updateProductGauges(aprobados);
			log.debug("Métricas TechStore actualizadas: ventas={}, ingresos={}, pendientes={}",
					ventasCompletadas.get(), ingresosSoles.get(), pagosPendientes.get());
		} catch (Exception ex) {
			log.warn("No se pudieron refrescar métricas de negocio en pago: {}", ex.getMessage());
		}
	}

	private void updateProductGauges(List<Pago> aprobados) {
		Map<String, Double> acumulado = new ConcurrentHashMap<>();
		for (Pago pago : aprobados) {
			try {
				PedidoDto pedido = pedidoClient.findById(pago.getIdPedido());
				if (pedido == null || pedido.getItems() == null) {
					continue;
				}
				for (PedidoItemDto item : pedido.getItems()) {
					if (item == null || item.getNombreProducto() == null || item.getCantidad() == null) {
						continue;
					}
					acumulado.merge(item.getNombreProducto(), item.getCantidad().doubleValue(), Double::sum);
				}
			} catch (Exception ex) {
				log.debug("No se pudo leer pedido {} para métricas: {}", pago.getIdPedido(), ex.getMessage());
			}
		}

		Set<String> activos = new HashSet<>(acumulado.keySet());
		for (Map.Entry<String, Double> entry : acumulado.entrySet()) {
			unidadesPorProducto
					.computeIfAbsent(entry.getKey(), this::registerProductGauge)
					.set(entry.getValue());
		}
		for (Map.Entry<String, AtomicReference<Double>> entry : unidadesPorProducto.entrySet()) {
			if (!activos.contains(entry.getKey())) {
				entry.getValue().set(0.0);
			}
		}
	}

	private AtomicReference<Double> registerProductGauge(String producto) {
		AtomicReference<Double> value = new AtomicReference<>(0.0);
		Gauge.builder("techstore.producto.unidades.vendidas", value, AtomicReference::get)
				.description("Unidades vendidas por producto (ventas aprobadas)")
				.tags(Tags.of("producto", producto))
				.register(meterRegistry);
		return value;
	}

	public static boolean isApproved(String estado) {
		if (estado == null) {
			return false;
		}
		String normalized = estado.trim().toUpperCase();
		return normalized.equals("APROBADO")
				|| normalized.equals("PAGADO")
				|| normalized.equals("COMPLETADO");
	}
}
