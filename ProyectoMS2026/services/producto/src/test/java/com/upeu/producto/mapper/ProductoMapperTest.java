package com.upeu.producto.mapper;

import com.upeu.producto.dto.ProductoRequest;
import com.upeu.producto.dto.ProductoResponse;
import com.upeu.producto.entity.Producto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class ProductoMapperTest {

    private final ProductoMapper productoMapper = new ProductoMapper();

    @Test
    void shouldMapRequestToEntity() {
        ProductoRequest request = ProductoRequest.builder()
            .nombre("Laptop")
            .descripcion("Portatil de oficina")
            .idCategoria(3L)
            .precio(new BigDecimal("100.00"))
            .stock(5)
            .activo(true)
                .build();

        Producto entity = productoMapper.toEntity(request);

        assertThat(entity).isNotNull();
        assertThat(entity.getNombre()).isEqualTo("Laptop");
        assertThat(entity.getDescripcion()).isEqualTo("Portatil de oficina");
        assertThat(entity.getIdCategoria()).isEqualTo(3L);
        assertThat(entity.getPrecio()).isEqualByComparingTo("100.00");
    }

    @Test
    void shouldMapEntityToResponse() {
        Producto entity = Producto.builder()
            .id(1L)
            .nombre("Mouse")
            .descripcion("Periferico")
            .idCategoria(4L)
            .precio(new BigDecimal("50.00"))
            .stock(10)
            .activo(true)
                .build();

        ProductoResponse response = productoMapper.toResponse(entity);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getNombre()).isEqualTo("Mouse");
        assertThat(response.getDescripcion()).isEqualTo("Periferico");
        assertThat(response.getIdCategoria()).isEqualTo(4L);
    }

    @Test
    void shouldUpdateEntityFromRequest() {
        Producto entity = Producto.builder()
            .id(1L)
                .nombre("Anterior")
                .descripcion("Anterior descripcion")
            .idCategoria(1L)
            .precio(new BigDecimal("10.00"))
            .stock(1)
            .activo(true)
                .build();
        ProductoRequest request = ProductoRequest.builder()
                .nombre("Nueva")
                .descripcion("Nueva descripcion")
            .idCategoria(2L)
            .precio(new BigDecimal("20.00"))
            .stock(2)
            .activo(false)
                .build();

        productoMapper.updateEntityFromRequest(entity, request);

        assertThat(entity.getNombre()).isEqualTo("Nueva");
        assertThat(entity.getDescripcion()).isEqualTo("Nueva descripcion");
        assertThat(entity.getIdCategoria()).isEqualTo(2L);
        assertThat(entity.getActivo()).isFalse();
    }
}
