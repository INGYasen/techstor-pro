package com.upeu.producto.service;

import com.upeu.producto.dto.ImagenUploadResponse;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface ProductoImagenService {

    ImagenUploadResponse guardarImagen(MultipartFile archivo);

    Resource obtenerImagen(String nombreArchivo);
}
