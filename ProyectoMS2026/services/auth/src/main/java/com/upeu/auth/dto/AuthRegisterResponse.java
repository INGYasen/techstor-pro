package com.upeu.auth.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AuthRegisterResponse {

    private Long id;
    private String username;
    private List<String> roles;
    private String nombreCompleto;
    private String email;
}
