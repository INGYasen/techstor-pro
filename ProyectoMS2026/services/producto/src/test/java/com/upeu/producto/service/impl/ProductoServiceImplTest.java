package com.upeu.producto.service.impl;

import com.upeu.producto.client.CatalogoClient;
import com.upeu.producto.dto.CategoriaDto;
import com.upeu.producto.dto.ProductoRequest;
import com.upeu.producto.dto.ProductoResponse;
import com.upeu.producto.entity.Producto;
import com.upeu.producto.exception.ResourceNotFoundException;
import com.upeu.producto.mapper.ProductoMapper;
import com.upeu.producto.repository.ProductoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductoServiceImplTest {

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private CatalogoClient catalogoClient;

    @Spy
    private ProductoMapper productoMapper = new ProductoMapper();

    @InjectMocks
    private ProductoServiceImpl productoService;

    @Test
    void shouldCreateProducto() {
        ProductoRequest request = ProductoRequest.builder()
                .nombre("Laptop")
                .descripcion("Portatil de oficina")
                .idCategoria(3L)
                .precio(new BigDecimal("2500.00"))
                .stock(10)
                .activo(true)
                .build();
        Producto savedEntity = Producto.builder()
                .id(1L)
                .nombre("Laptop")
                .descripcion("Portatil de oficina")
                .idCategoria(3L)
                .precio(new BigDecimal("2500.00"))
                .stock(10)
                .activo(true)
                .build();

        when(catalogoClient.findCategoriaById(3L)).thenReturn(CategoriaDto.builder().id(3L).nombre("Laptops").build());
        when(productoRepository.save(any(Producto.class))).thenReturn(savedEntity);

        ProductoResponse response = productoService.create(request);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getNombre()).isEqualTo("Laptop");
        assertThat(response.getIdCategoria()).isEqualTo(3L);
        assertThat(response.getPrecio()).isEqualByComparingTo("2500.00");
    }

    @Test
    void shouldThrowWhenProductoNotFound() {
        when(productoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productoService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }
}
