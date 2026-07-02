package com.upeu.pedido.repository;

import com.upeu.pedido.entity.PedidoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PedidoItemRepository extends JpaRepository<PedidoItem, Long> {

	List<PedidoItem> findByPedidoId(Long pedidoId);

	void deleteByPedidoId(Long pedidoId);

	@Query("SELECT COALESCE(SUM(i.cantidad), 0) FROM PedidoItem i WHERE i.pedidoId IN :pedidoIds")
	long sumCantidadByPedidoIdIn(@Param("pedidoIds") List<Long> pedidoIds);

	@Query("SELECT COALESCE(SUM(i.cantidad), 0) FROM PedidoItem i")
	long sumCantidadTotal();

	@Query("""
			SELECT i.nombreProducto, COALESCE(SUM(i.cantidad), 0)
			FROM PedidoItem i
			WHERE i.pedidoId IN :pedidoIds
			GROUP BY i.nombreProducto
			ORDER BY SUM(i.cantidad) DESC
			""")
	List<Object[]> sumCantidadByProducto(@Param("pedidoIds") List<Long> pedidoIds);

	@Query("""
			SELECT i.nombreProducto, COALESCE(SUM(i.cantidad), 0)
			FROM PedidoItem i
			GROUP BY i.nombreProducto
			ORDER BY SUM(i.cantidad) DESC
			""")
	List<Object[]> sumCantidadByProductoAll();
}
