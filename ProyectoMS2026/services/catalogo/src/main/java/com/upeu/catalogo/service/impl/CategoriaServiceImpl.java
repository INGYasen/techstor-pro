package com.upeu.catalogo.service.impl;

import com.upeu.catalogo.dto.CategoriaRequest;
import com.upeu.catalogo.dto.CategoriaResponse;
import com.upeu.catalogo.entity.Categoria;
import com.upeu.catalogo.exception.ResourceNotFoundException;
import com.upeu.catalogo.mapper.CategoriaMapper;
import com.upeu.catalogo.repository.CategoriaRepository;
import com.upeu.catalogo.service.CategoriaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoriaServiceImpl implements CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final CategoriaMapper categoriaMapper;

    @Override
    @Transactional
    public CategoriaResponse create(CategoriaRequest request) {
        log.info("Iniciando creación de categoría con nombre: {}", request.getNombre());
        Categoria categoria = categoriaMapper.toEntity(request);
        Categoria savedCategoria = categoriaRepository.save(categoria);
        log.info("Categoría creada exitosamente con ID: {}", savedCategoria.getId());
        return categoriaMapper.toResponse(savedCategoria);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoriaResponse> findAll() {
        log.info("Recuperando lista de categorías");
        List<CategoriaResponse> categorias = categoriaRepository.findAll()
                .stream()
                .map(categoriaMapper::toResponse)
                .toList();
        log.info("Se encontraron {} categorías", categorias.size());
        return categorias;
    }

    @Override
    @Transactional(readOnly = true)
    public CategoriaResponse findById(Long id) {
        log.info("Buscando categoría con ID: {}", id);
        log.info("[CATALOGO] Buscando categoria id={}", id);
        Categoria categoria = getCategoriaById(id);
        log.info("Categoría encontrada: {} (ID: {})", categoria.getNombre(), id);
        return categoriaMapper.toResponse(categoria);
    }

    @Override
    @Transactional
    public CategoriaResponse update(Long id, CategoriaRequest request) {
        log.info("Iniciando actualización de categoría ID: {}", id);
        Categoria categoria = getCategoriaById(id);
        categoriaMapper.updateEntityFromRequest(categoria, request);
        Categoria updatedCategoria = categoriaRepository.save(categoria);
        log.info("Categoría ID: {} actualizada exitosamente", id);
        return categoriaMapper.toResponse(updatedCategoria);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        log.info("Iniciando eliminación de categoría ID: {}", id);
        getCategoriaById(id);
        categoriaRepository.deleteById(id);
        log.info("Categoría ID: {} eliminada exitosamente", id);
    }

    private Categoria getCategoriaById(Long id) {
        var categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Categoría no encontrada: ID {}", id);
                    return new ResourceNotFoundException("Categoría con id " + id + " no encontrada");
                });
        return categoria;
    }
}
