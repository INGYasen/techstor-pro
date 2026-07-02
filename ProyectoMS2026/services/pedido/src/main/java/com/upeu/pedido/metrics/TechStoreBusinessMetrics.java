package com.upeu.pedido.metrics;

import com.upeu.pedido.repository.PedidoItemRepository;
import com.upeu.pedido.repository.PedidoRepository;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Component
@Slf4j
public class TechStoreBusinessMetrics {

	private final PedidoRepository pedidoRepository;
	private final PedidoItemRepository pedidoItemRepository;
	private final MeterRegistry meterRegistry;

	private final AtomicReference<Double> pedidosTotales = new AtomicReference<>(0.0);
	private final AtomicReference<Double> unidadesPedidas = new AtomicReference<>(0.0);
	private final Map<String, AtomicReference<Double>> unidadesPorProducto = new ConcurrentHashMap<>();

	public TechStoreBusinessMetrics(
			PedidoRepository pedidoRepository,
			PedidoItemRepository pedidoItemRepository,
			MeterRegistry meterRegistry) {
		this.pedidoRepository = pedidoRepository;
		this.pedidoItemRepository = pedidoItemRepository;
		this.meterRegistry = meterRegistry;

		registerGauge("techstore.pedidos.totales", pedidosTotales, "Pedidos registrados en TechStore");
		registerGauge("techstore.unidades.pedidas", unidadesPedidas, "Unidades en todos los pedidos");
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
			pedidosTotales.set((double) pedidoRepository.count());
			unidadesPedidas.set((double) pedidoItemRepository.sumCantidadTotal());
			updateProductGauges();
			log.debug("Métricas TechStore pedido: pedidos={}, unidades={}",
					pedidosTotales.get(), unidadesPedidas.get());
		} catch (Exception ex) {
			log.warn("No se pudieron refrescar métricas de negocio en pedido: {}", ex.getMessage());
		}
	}

	private void updateProductGauges() {
		Set<String> activos = new HashSet<>();
		for (Object[] row : pedidoItemRepository.sumCantidadByProductoAll()) {
			String producto = (String) row[0];
			double cantidad = ((Number) row[1]).doubleValue();
			activos.add(producto);
			unidadesPorProducto
					.computeIfAbsent(producto, this::registerProductGauge)
					.set(cantidad);
		}
		for (Map.Entry<String, AtomicReference<Double>> entry : unidadesPorProducto.entrySet()) {
			if (!activos.contains(entry.getKey())) {
				entry.getValue().set(0.0);
			}
		}
	}

	private AtomicReference<Double> registerProductGauge(String producto) {
		AtomicReference<Double> value = new AtomicReference<>(0.0);
		Gauge.builder("techstore.producto.unidades.pedidas", value, AtomicReference::get)
				.description("Unidades pedidas por producto")
				.tags(Tags.of("producto", producto))
				.register(meterRegistry);
		return value;
	}
}
