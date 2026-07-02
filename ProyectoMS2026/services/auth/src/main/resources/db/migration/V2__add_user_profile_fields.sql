ALTER TABLE users
    ADD COLUMN nombre_completo VARCHAR(150) NULL,
    ADD COLUMN email VARCHAR(150) NULL;

UPDATE users
SET email = CONCAT(username, '@techstore.com')
WHERE email IS NULL;

UPDATE users
SET nombre_completo = 'Administrador TechStore'
WHERE username = 'admin' AND nombre_completo IS NULL;

UPDATE users
SET nombre_completo = 'Cliente Demo'
WHERE username = 'user' AND nombre_completo IS NULL;

UPDATE users
SET email = 'admin@techstore.com'
WHERE username = 'admin';

UPDATE users
SET email = 'cliente@techstore.com'
WHERE username = 'user';

CREATE UNIQUE INDEX uk_users_email ON users (email);
