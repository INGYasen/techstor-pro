ALTER TABLE pagos
    ADD COLUMN user_id BIGINT NULL AFTER id_pedido,
    ADD COLUMN referencia_transaccion VARCHAR(100) NULL AFTER estado,
    ADD COLUMN fecha_pago DATETIME NULL AFTER referencia_transaccion;

UPDATE pagos SET user_id = 1 WHERE user_id IS NULL;

ALTER TABLE pagos
    MODIFY COLUMN user_id BIGINT NOT NULL,
    ADD UNIQUE INDEX uk_pagos_id_pedido (id_pedido);
