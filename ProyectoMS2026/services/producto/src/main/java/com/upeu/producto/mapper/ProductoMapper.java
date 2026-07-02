package com.upeu.producto.mapper;

import com.upeu.producto.dto.ProductoRequest;
import com.upeu.producto.dto.ProductoResponse;
import com.upeu.producto.entity.Producto;
import org.springframework.stereotype.Component;

@Component
public class ProductoMapper {

    public Producto toEntity(ProductoRequest request) {
        if (request == null) {
            return null;
        }

        return Producto.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .idCategoria(request.getIdCategoria())
                .precio(request.getPrecio())
                .stock(request.getStock())
                .activo(request.getActivo() != null ? request.getActivo() : true)
                .sku(request.getSku())
                .imagenUrl(request.getImagenUrl())
                .enOferta(request.getEnOferta() != null ? request.getEnOferta() : false)
                .build();
    }

    public ProductoResponse toResponse(Producto entity) {
        if (entity == null) {
            return null;
        }

        return ProductoResponse.builder()
                .id(entity.getId())
                .nombre(entity.getNombre())
                .descripcion(entity.getDescripcion())
                .idCategoria(entity.getIdCategoria())
                .precio(entity.getPrecio())
                .stock(entity.getStock())
                .activo(entity.getActivo())
                .sku(entity.getSku())
                .imagenUrl(entity.getImagenUrl())
                .enOferta(entity.getEnOferta() != null ? entity.getEnOferta() : false)
                .build();
    }

    public void updateEntityFromRequest(Producto entity, ProductoRequest request) {
        entity.setNombre(request.getNombre());
        entity.setDescripcion(request.getDescripcion());
        entity.setIdCategoria(request.getIdCategoria());
        entity.setPrecio(request.getPrecio());
        entity.setStock(request.getStock());
        if (request.getActivo() != null) {
            entity.setActivo(request.getActivo());
        }
        entity.setSku(request.getSku());
        entity.setImagenUrl(request.getImagenUrl());
        if (request.getEnOferta() != null) {
            entity.setEnOferta(request.getEnOferta());
        }
    }
}
