ALTER TABLE pedidos
    ADD COLUMN user_id BIGINT NULL AFTER id,
    ADD COLUMN direccion_envio VARCHAR(255) NULL AFTER observacion,
    ADD COLUMN total DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER direccion_envio,
    ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER total;

UPDATE pedidos SET user_id = 1 WHERE user_id IS NULL;

ALTER TABLE pedidos
    MODIFY COLUMN user_id BIGINT NOT NULL;

CREATE TABLE IF NOT EXISTS pedido_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    pedido_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    nombre_producto VARCHAR(100) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_pedido_items_pedido (pedido_id)
);
