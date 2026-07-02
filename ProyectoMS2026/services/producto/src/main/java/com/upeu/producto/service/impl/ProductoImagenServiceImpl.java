package com.upeu.producto.service.impl;

import com.upeu.producto.config.ProductoProperties;
import com.upeu.producto.dto.ImagenUploadResponse;
import com.upeu.producto.exception.ResourceNotFoundException;
import com.upeu.producto.service.ProductoImagenService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductoImagenServiceImpl implements ProductoImagenService {

    private static final Set<String> TIPOS_PERMITIDOS = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );

    private final ProductoProperties productoProperties;

    @PostConstruct
    public void initUploadDir() throws IOException {
        Files.createDirectories(resolveUploadDir());
    }

    @Override
    public ImagenUploadResponse guardarImagen(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new IllegalArgumentException("Debe seleccionar una imagen");
        }

        if (archivo.getSize() > productoProperties.getMaxImageSizeBytes()) {
            throw new IllegalArgumentException("La imagen no debe superar 5 MB");
        }

        String contentType = archivo.getContentType();
        if (contentType == null || !TIPOS_PERMITIDOS.contains(contentType)) {
            throw new IllegalArgumentException("Formato no permitido. Usa JPG, PNG, WEBP o GIF");
        }

        String extension = obtenerExtension(archivo.getOriginalFilename(), contentType);
        String nombreArchivo = UUID.randomUUID() + extension;
        Path destino = resolveUploadDir().resolve(nombreArchivo);

        try {
            Files.copy(archivo.getInputStream(), destino, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            log.error("No se pudo guardar la imagen {}", nombreArchivo, ex);
            throw new IllegalStateException("No se pudo guardar la imagen");
        }

        String imagenUrl = "/api/v1/productos/imagenes/" + nombreArchivo;
        log.info("Imagen guardada en {}", imagenUrl);

        return ImagenUploadResponse.builder()
                .imagenUrl(imagenUrl)
                .nombreArchivo(nombreArchivo)
                .build();
    }

    @Override
    public Resource obtenerImagen(String nombreArchivo) {
        if (!StringUtils.hasText(nombreArchivo) || nombreArchivo.contains("..")) {
            throw new IllegalArgumentException("Nombre de archivo inválido");
        }

        try {
            Path archivo = resolveUploadDir().resolve(nombreArchivo).normalize();
            if (!archivo.startsWith(resolveUploadDir()) || !Files.exists(archivo)) {
                throw new ResourceNotFoundException("Imagen no encontrada");
            }

            Resource resource = new UrlResource(archivo.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("Imagen no encontrada");
            }
            return resource;
        } catch (IOException ex) {
            throw new ResourceNotFoundException("Imagen no encontrada");
        }
    }

    private Path resolveUploadDir() {
        return Path.of(productoProperties.getUploadDir()).toAbsolutePath().normalize();
    }

    private String obtenerExtension(String originalFilename, String contentType) {
        String extension = StringUtils.getFilenameExtension(originalFilename);
        if (StringUtils.hasText(extension)) {
            return "." + extension.toLowerCase();
        }

        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".jpg";
        };
    }
}
