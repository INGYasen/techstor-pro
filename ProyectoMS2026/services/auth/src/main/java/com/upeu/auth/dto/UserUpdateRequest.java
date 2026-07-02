package com.upeu.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserUpdateRequest {

    @Size(max = 150)
    private String nombreCompleto;

    @Email
    @Size(max = 150)
    private String email;

    @Pattern(regexp = "ADMIN|USER")
    private String role;

    private Boolean enabled;

    @Size(min = 6, max = 100)
    private String password;
}
