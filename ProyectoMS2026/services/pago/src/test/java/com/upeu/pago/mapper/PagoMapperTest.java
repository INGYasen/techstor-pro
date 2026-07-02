package com.upeu.pago.mapper;

import com.upeu.pago.dto.PagoRequest;
import com.upeu.pago.dto.PagoResponse;
import com.upeu.pago.entity.Pago;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PagoMapperTest {

	private final PagoMapper mapper = new PagoMapper();

	@Test
	void shouldMapRequestToEntity() {
		PagoRequest request = PagoRequest.builder()
				.idPedido(5L)
				.monto(new BigDecimal("12.34"))
				.metodo("YAPE")
				.estado("OK")
				.build();

		Pago entity = mapper.toEntity(request, 1L);

		assertThat(entity.getIdPedido()).isEqualTo(5L);
		assertThat(entity.getUserId()).isEqualTo(1L);
		assertThat(entity.getMonto()).isEqualByComparingTo("12.34");
	}

	@Test
	void shouldMapEntityToResponse() {
		Pago entity = Pago.builder()
				.id(1L)
				.idPedido(5L)
				.userId(1L)
				.monto(BigDecimal.ONE)
				.metodo("X")
				.estado("Y")
				.build();

		PagoResponse response = mapper.toResponse(entity);

		assertThat(response.getId()).isEqualTo(1L);
		assertThat(response.getIdPedido()).isEqualTo(5L);
	}
}
