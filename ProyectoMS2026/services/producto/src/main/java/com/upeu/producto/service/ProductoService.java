package com.upeu.producto.service;

import com.upeu.producto.dto.DescontarStockRequest;
import com.upeu.producto.dto.ProductoRequest;
import com.upeu.producto.dto.ProductoResponse;

import java.util.List;

public interface ProductoService {

    ProductoResponse create(ProductoRequest request);

    List<ProductoResponse> findAll();

    ProductoResponse findById(Long id);

    ProductoResponse update(Long id, ProductoRequest request);

    void delete(Long id);

    ProductoResponse findDetalleById(Long id);

    ProductoResponse descontarStock(Long id, DescontarStockRequest request);
}
