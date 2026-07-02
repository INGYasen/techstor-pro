package com.upeu.pago.repository;

import com.upeu.pago.entity.Pago;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PagoRepository extends JpaRepository<Pago, Long> {

	boolean existsByIdPedido(Long idPedido);

	Optional<Pago> findByIdPedido(Long idPedido);
}
