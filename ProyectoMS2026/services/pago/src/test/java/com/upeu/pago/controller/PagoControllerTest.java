package com.upeu.pago.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.upeu.pago.dto.PagoRequest;
import com.upeu.pago.dto.PagoResponse;
import com.upeu.pago.exception.GlobalExceptionHandler;
import com.upeu.pago.service.PagoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PagoController.class)
@Import(GlobalExceptionHandler.class)
@ActiveProfiles("test")
class PagoControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private PagoService pagoService;

	@Test
	void shouldReturnPagos() throws Exception {
		when(pagoService.findAll()).thenReturn(List.of(
				PagoResponse.builder()
						.id(1L)
						.idPedido(10L)
						.monto(new BigDecimal("99.50"))
						.metodo("TARJETA")
						.estado("APROBADO")
						.build()));

		mockMvc.perform(get("/api/v1/pagos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value(1L))
				.andExpect(jsonPath("$[0].idPedido").value(10L));
	}

	@Test
	void shouldValidateCreateRequest() throws Exception {
		PagoRequest request = PagoRequest.builder()
				.idPedido(null)
				.monto(new BigDecimal("10"))
				.metodo("EFECTIVO")
				.estado("PENDIENTE")
				.build();

		mockMvc.perform(post("/api/v1/pagos")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Error de validación"))
				.andExpect(jsonPath("$.validationErrors.idPedido").exists());
	}
}
