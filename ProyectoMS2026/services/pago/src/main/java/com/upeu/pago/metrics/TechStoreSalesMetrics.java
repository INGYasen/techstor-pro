package com.upeu.pago.metrics;

import com.upeu.pago.client.PedidoClient;
import com.upeu.pago.dto.PedidoDto;
import com.upeu.pago.dto.PedidoItemDto;
import com.upeu.pago.entity.Pago;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class TechStoreSalesMetrics {

	private final PedidoClient pedidoClient;
	private final MeterRegistry meterRegistry;
	private final Counter ventasCompletadasCounter;
	private final Counter ingresosSolesCounter;
	private final Map<String, Counter> unidadesPorProducto = new ConcurrentHashMap<>();

	public TechStoreSalesMetrics(PedidoClient pedidoClient, MeterRegistry meterRegistry) {
		this.pedidoClient = pedidoClient;
		this.meterRegistry = meterRegistry;
		this.ventasCompletadasCounter = Counter.builder("techstore.ventas.completadas.total")
				.description("Contador de ventas completadas (pagos aprobados)")
				.register(meterRegistry);
		this.ingresosSolesCounter = Counter.builder("techstore.ingresos.soles.total")
				.description("Ingresos acumulados por ventas aprobadas")
				.register(meterRegistry);
	}

	public void recordApprovedSale(Pago pago) {
		if (pago == null || pago.getMonto() == null) {
			return;
		}

		ventasCompletadasCounter.increment();
		ingresosSolesCounter.increment(pago.getMonto().doubleValue());
		recordProductUnits(pago.getIdPedido());
	}

	private void recordProductUnits(Long pedidoId) {
		try {
			PedidoDto pedido = pedidoClient.findById(pedidoId);
			if (pedido == null || pedido.getItems() == null) {
				return;
			}
			for (PedidoItemDto item : pedido.getItems()) {
				if (item == null || item.getNombreProducto() == null || item.getCantidad() == null) {
					continue;
				}
				unidadesPorProducto
						.computeIfAbsent(item.getNombreProducto(), this::productCounter)
						.increment(item.getCantidad());
			}
		} catch (Exception ex) {
			log.debug("No se pudieron registrar unidades por producto para pedido {}: {}", pedidoId, ex.getMessage());
		}
	}

	private Counter productCounter(String producto) {
		return Counter.builder("techstore.producto.unidades.vendidas.total")
				.description("Unidades vendidas por producto")
				.tags(Tags.of("producto", producto))
				.register(meterRegistry);
	}

	public static boolean isApprovedState(String estado) {
		if (estado == null) {
			return false;
		}
		String normalized = estado.trim().toUpperCase();
		return normalized.equals("APROBADO")
				|| normalized.equals("PAGADO")
				|| normalized.equals("COMPLETADO");
	}
}
