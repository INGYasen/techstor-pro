package com.upeu.auth.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AuthLoginResponse {

    private Long userId;
    private String accessToken;
    private String tokenType;
    private long expiresIn;
    private String username;
    private List<String> roles;
    private String nombreCompleto;
    private String email;
    private String nombres;
    private String apellidos;
}
