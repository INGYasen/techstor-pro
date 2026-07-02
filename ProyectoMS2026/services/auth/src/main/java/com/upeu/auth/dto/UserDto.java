package com.upeu.auth.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class UserDto {

    private Long id;
    private String username;
    private String nombreCompleto;
    private String email;
    private String nombres;
    private String apellidos;
    private String dni;
    private LocalDate fechaNacimiento;
    private String sexo;
    private String telefono;
    private String pais;
    private String departamento;
    private String provincia;
    private String distrito;
    private String codigoPostal;
    private String direccion;
    private String referencia;
    private List<String> roles;
    private boolean enabled;
}
