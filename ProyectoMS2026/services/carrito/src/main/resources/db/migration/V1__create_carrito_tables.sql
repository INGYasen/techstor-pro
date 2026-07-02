DROP TABLE IF EXISTS carrito_items;
DROP TABLE IF EXISTS carritos;

CREATE TABLE carritos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_carritos_user_id UNIQUE (user_id)
);

CREATE TABLE carrito_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    carrito_id BIGINT NOT NULL,
    producto_id BIGINT NOT NULL,
    cantidad INT NOT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    imagen_url VARCHAR(500),
    stock_disponible INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_carrito_items_carrito FOREIGN KEY (carrito_id) REFERENCES carritos (id) ON DELETE CASCADE,
    CONSTRAINT uk_carrito_items_producto UNIQUE (carrito_id, producto_id)
);
