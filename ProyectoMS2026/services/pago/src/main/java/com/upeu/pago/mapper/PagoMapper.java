package com.upeu.pago.mapper;

import com.upeu.pago.dto.PagoRequest;
import com.upeu.pago.dto.PagoResponse;
import com.upeu.pago.entity.Pago;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class PagoMapper {

	public Pago toEntity(PagoRequest request, Long userId) {
		if (request == null) {
			return null;
		}
		return Pago.builder()
				.idPedido(request.getIdPedido())
				.userId(userId)
				.monto(request.getMonto())
				.metodo(request.getMetodo())
				.estado(request.getEstado())
				.referenciaTransaccion(request.getReferenciaTransaccion())
				.fechaPago("APROBADO".equalsIgnoreCase(request.getEstado()) ? LocalDateTime.now() : null)
				.build();
	}

	public PagoResponse toResponse(Pago entity) {
		if (entity == null) {
			return null;
		}
		return PagoResponse.builder()
				.id(entity.getId())
				.idPedido(entity.getIdPedido())
				.userId(entity.getUserId())
				.monto(entity.getMonto())
				.metodo(entity.getMetodo())
				.estado(entity.getEstado())
				.referenciaTransaccion(entity.getReferenciaTransaccion())
				.fechaPago(entity.getFechaPago())
				.build();
	}

	public void updateEntityFromRequest(Pago entity, PagoRequest request) {
		entity.setMonto(request.getMonto());
		entity.setMetodo(request.getMetodo());
		entity.setEstado(request.getEstado());
		entity.setReferenciaTransaccion(request.getReferenciaTransaccion());
		if ("APROBADO".equalsIgnoreCase(request.getEstado()) && entity.getFechaPago() == null) {
			entity.setFechaPago(LocalDateTime.now());
		}
	}
}
