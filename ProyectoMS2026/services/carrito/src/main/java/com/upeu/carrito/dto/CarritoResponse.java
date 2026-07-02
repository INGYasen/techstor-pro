package com.upeu.carrito.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CarritoResponse {

	private Long id;
	private Long userId;
	private List<CarritoItemResponse> items;
	private LocalDateTime updatedAt;
}
