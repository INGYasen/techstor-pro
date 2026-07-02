package com.upeu.auth.controller;

import com.upeu.auth.dto.ProfileUpdateRequest;
import com.upeu.auth.dto.UserDto;
import com.upeu.auth.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class ProfileController {

    private final UserService userService;

    @GetMapping("/me")
    public UserDto obtenerPerfil(@AuthenticationPrincipal Jwt jwt) {
        return userService.obtenerPorUsername(resolveUsername(jwt));
    }

    @PutMapping("/me")
    public UserDto actualizarPerfil(@AuthenticationPrincipal Jwt jwt,
                                    @Valid @RequestBody ProfileUpdateRequest request) {
        return userService.actualizarPerfil(resolveUsername(jwt), request);
    }

    private String resolveUsername(Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        if (username == null || username.isBlank()) {
            username = jwt.getSubject();
        }
        return username;
    }
}
