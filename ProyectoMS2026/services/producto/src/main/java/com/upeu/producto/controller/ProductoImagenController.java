package com.upeu.producto.controller;

import com.upeu.producto.dto.ImagenUploadResponse;
import com.upeu.producto.service.ProductoImagenService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/productos")
@RequiredArgsConstructor
public class ProductoImagenController {

    private final ProductoImagenService productoImagenService;

    @PostMapping(value = "/imagen", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImagenUploadResponse> subirImagen(@RequestPart("archivo") MultipartFile archivo) {
        return ResponseEntity.ok(productoImagenService.guardarImagen(archivo));
    }

    @GetMapping("/imagenes/{nombreArchivo}")
    public ResponseEntity<Resource> obtenerImagen(@PathVariable String nombreArchivo) {
        Resource resource = productoImagenService.obtenerImagen(nombreArchivo);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (nombreArchivo.endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        } else if (nombreArchivo.endsWith(".gif")) {
            mediaType = MediaType.IMAGE_GIF;
        } else if (nombreArchivo.endsWith(".webp")) {
            mediaType = MediaType.parseMediaType("image/webp");
        } else if (nombreArchivo.endsWith(".jpg") || nombreArchivo.endsWith(".jpeg")) {
            mediaType = MediaType.IMAGE_JPEG;
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + nombreArchivo + "\"")
                .contentType(mediaType)
                .body(resource);
    }
}
