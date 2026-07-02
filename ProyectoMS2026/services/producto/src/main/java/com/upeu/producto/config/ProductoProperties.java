package com.upeu.producto.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "producto")
public class ProductoProperties {

    private String uploadDir = "uploads/productos";
    private long maxImageSizeBytes = 5 * 1024 * 1024;
}
