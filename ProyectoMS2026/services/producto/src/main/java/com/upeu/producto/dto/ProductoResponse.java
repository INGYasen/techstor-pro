package com.upeu.producto.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductoResponse {

    private Long id;
    private String nombre;
    private String descripcion;
    private Long idCategoria;
    private BigDecimal precio;
    private Integer stock;
    private Boolean activo;
    private String sku;
    private String imagenUrl;
    private Boolean enOferta;
    private CategoriaDto categoria;
}
