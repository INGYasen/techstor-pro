package com.upeu.pedido.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.upeu.pedido.dto.PedidoRequest;
import com.upeu.pedido.dto.PedidoResponse;
import com.upeu.pedido.exception.GlobalExceptionHandler;
import com.upeu.pedido.service.PedidoService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PedidoController.class)
@Import(GlobalExceptionHandler.class)
@ActiveProfiles("test")
class PedidoControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockBean
	private PedidoService pedidoService;

	@Test
	void shouldReturnPedidos() throws Exception {
		when(pedidoService.findAll()).thenReturn(List.of(
				PedidoResponse.builder().id(1L).cliente("Ana").estado("PENDIENTE").observacion("").build()));

		mockMvc.perform(get("/api/v1/pedidos"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value(1L))
				.andExpect(jsonPath("$[0].cliente").value("Ana"));
	}

	@Test
	void shouldValidateCreateRequest() throws Exception {
		PedidoRequest request = PedidoRequest.builder()
				.userId(null)
				.cliente("")
				.estado("PENDIENTE")
				.items(List.of())
				.build();

		mockMvc.perform(post("/api/v1/pedidos")
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(request)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Error de validación"))
				.andExpect(jsonPath("$.validationErrors.cliente").exists());
	}
}
