package com.upeu.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class ProfileUpdateRequest {

    @Size(max = 80)
    private String nombres;

    @Size(max = 120)
    private String apellidos;

    @Size(max = 150)
    private String nombreCompleto;

    @Email
    @Size(max = 150)
    private String email;

    @Size(max = 8)
    private String dni;

    private LocalDate fechaNacimiento;

    @Size(max = 20)
    private String sexo;

    @Size(max = 20)
    private String telefono;

    @Size(max = 80)
    private String pais;

    @Size(max = 80)
    private String departamento;

    @Size(max = 80)
    private String provincia;

    @Size(max = 80)
    private String distrito;

    @Size(max = 12)
    private String codigoPostal;

    @Size(max = 255)
    private String direccion;

    @Size(max = 255)
    private String referencia;
}
