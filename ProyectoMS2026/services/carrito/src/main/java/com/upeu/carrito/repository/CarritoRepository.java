package com.upeu.carrito.repository;

import com.upeu.carrito.entity.Carrito;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CarritoRepository extends JpaRepository<Carrito, Long> {

	Optional<Carrito> findByUserId(Long userId);
}
