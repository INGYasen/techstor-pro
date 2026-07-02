package com.upeu.auth.controller;

import com.upeu.auth.dto.UserCreateRequest;
import com.upeu.auth.dto.UserDto;
import com.upeu.auth.dto.UserUpdateRequest;
import com.upeu.auth.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/auth/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserDto> listar() {
        return userService.listar();
    }

    @GetMapping("/{id}")
    public UserDto obtener(@PathVariable Long id) {
        return userService.obtener(id);
    }

    @PostMapping
    public ResponseEntity<UserDto> crear(@Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.crear(request));
    }

    @PutMapping("/{id}")
    public UserDto actualizar(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        return userService.actualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        String username = jwt.getClaimAsString("preferred_username");
        if (username == null) {
            username = jwt.getSubject();
        }
        userService.eliminar(id, username);
        return ResponseEntity.noContent().build();
    }
}
