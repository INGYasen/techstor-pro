package com.upeu.producto.service.impl;

import com.upeu.producto.client.CatalogoClient;
import com.upeu.producto.dto.CategoriaDto;
import com.upeu.producto.dto.DescontarStockRequest;
import com.upeu.producto.dto.ProductoRequest;
import com.upeu.producto.dto.ProductoResponse;
import com.upeu.producto.entity.Producto;
import com.upeu.producto.exception.ResourceNotFoundException;
import com.upeu.producto.mapper.ProductoMapper;
import com.upeu.producto.repository.ProductoRepository;
import com.upeu.producto.service.ProductoService;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;
    private final ProductoMapper productoMapper;
    private final CatalogoClient catalogoClient;

    @Override
    @Transactional
    public ProductoResponse create(ProductoRequest request) {
        log.info("Iniciando creacion de producto con nombre: {} y idCategoria: {}", request.getNombre(),
                request.getIdCategoria());
        validarCategoria(request.getIdCategoria());
        Producto producto = productoMapper.toEntity(request);
        Producto savedProducto = productoRepository.save(producto);
        log.info("Producto creado exitosamente con ID: {}", savedProducto.getId());
        return productoMapper.toResponse(savedProducto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductoResponse> findAll() {
        log.info("Recuperando lista de productos");
        List<ProductoResponse> productos = productoRepository.findAll()
                .stream()
                .map(productoMapper::toResponse)
                .toList();
        log.info("Se encontraron {} productos", productos.size());
        return productos;
    }

    @Override
    @Transactional(readOnly = true)
    public ProductoResponse findById(Long id) {
        log.info("Buscando producto con ID: {}", id);
        Producto producto = getProductoById(id);
        log.info("Producto encontrado: {} (ID: {})", producto.getNombre(), id);
        return productoMapper.toResponse(producto);
    }

    @Override
    @Transactional
    public ProductoResponse update(Long id, ProductoRequest request) {
        log.info("Iniciando actualizacion de producto ID: {}", id);
        validarCategoria(request.getIdCategoria());
        Producto producto = getProductoById(id);
        productoMapper.updateEntityFromRequest(producto, request);
        Producto updatedProducto = productoRepository.save(producto);
        log.info("Producto ID: {} actualizado exitosamente", id);
        return productoMapper.toResponse(updatedProducto);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Iniciando eliminacion de producto ID: {}", id);
        getProductoById(id);
        productoRepository.deleteById(id);
        log.info("Producto ID: {} eliminado exitosamente", id);
    }

    @Override
    @Transactional
    public ProductoResponse descontarStock(Long id, DescontarStockRequest request) {
        Producto producto = getProductoById(id);
        if (!Boolean.TRUE.equals(producto.getActivo())) {
            throw new IllegalArgumentException("El producto " + id + " no está activo");
        }
        if (producto.getStock() < request.getCantidad()) {
            throw new IllegalArgumentException(
                    "Stock insuficiente para el producto " + id + ". Disponible: " + producto.getStock());
        }
        producto.setStock(producto.getStock() - request.getCantidad());
        return productoMapper.toResponse(productoRepository.save(producto));
    }

    private Producto getProductoById(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Producto no encontrado: ID {}", id);
                    return new ResourceNotFoundException("Producto con id " + id + " no encontrado");
                });
    }

    private void validarCategoria(Long idCategoria) {
        try {
            catalogoClient.findCategoriaById(idCategoria);
        } catch (Exception ex) {
            log.warn("Categoria {} no encontrada en catalogo: {}", idCategoria, ex.getMessage());
            throw new IllegalArgumentException("La categoría con id " + idCategoria + " no existe");
        }
    }

    @Override
    @Transactional(readOnly = true)
    @CircuitBreaker(name = "catalogo", fallbackMethod = "fallbackCategoria")
    public ProductoResponse findDetalleById(Long id) {
        log.info("[PRODUCTO] Buscando detalle de producto con ID: {}", id);

        Producto producto = getProductoById(id);
        log.info("[PRODUCTO] Consultando categoriaId={} en catalogo", producto.getIdCategoria());

        CategoriaDto categoria = catalogoClient.findCategoriaById(producto.getIdCategoria());

        return ProductoResponse.builder()
                .id(producto.getId())
                .nombre(producto.getNombre())
                .descripcion(producto.getDescripcion())
                .idCategoria(producto.getIdCategoria())
                .precio(producto.getPrecio())
                .stock(producto.getStock())
                .activo(producto.getActivo())
                .sku(producto.getSku())
                .imagenUrl(producto.getImagenUrl())
                .enOferta(producto.getEnOferta() != null ? producto.getEnOferta() : false)
                .categoria(categoria)
                .build();
    }

    public ProductoResponse fallbackCategoria(Long id, Throwable ex) {
        log.warn("[PRODUCTO] Fallback activado para producto ID {}. Motivo: {}", id, ex.getMessage());

        Producto producto = getProductoById(id);

        return ProductoResponse.builder()
                .id(producto.getId())
                .nombre(producto.getNombre())
                .descripcion(producto.getDescripcion())
                .idCategoria(producto.getIdCategoria())
                .precio(producto.getPrecio())
                .stock(producto.getStock())
                .activo(producto.getActivo())
                .sku(producto.getSku())
                .imagenUrl(producto.getImagenUrl())
                .enOferta(producto.getEnOferta() != null ? producto.getEnOferta() : false)
                .categoria(null)
                .build();
    }
}
