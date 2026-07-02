package com.upeu.auth.service;

import com.upeu.auth.config.JwtProperties;
import com.upeu.auth.dto.AuthLoginRequest;
import com.upeu.auth.dto.AuthLoginResponse;
import com.upeu.auth.dto.AuthRegisterRequest;
import com.upeu.auth.dto.AuthRegisterResponse;
import com.upeu.auth.entity.AuthUser;
import com.upeu.auth.entity.Role;
import com.upeu.auth.repository.AuthUserRepository;
import com.upeu.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final AuthUserRepository authUserRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthLoginResponse login(AuthLoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        AuthUser user = authUserRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
        String token = jwtService.generateToken(userDetails);
        List<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return AuthLoginResponse.builder()
                .userId(user.getId())
                .accessToken(token)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getExpiration())
                .username(userDetails.getUsername())
                .roles(roles)
                .nombreCompleto(user.getNombreCompleto())
                .email(user.getEmail())
                .nombres(user.getNombres())
                .apellidos(user.getApellidos())
                .build();
    }

    @Transactional
    public AuthRegisterResponse register(AuthRegisterRequest request) {
        if (authUserRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El usuario '" + request.getUsername() + "' ya existe");
        }

        String email = request.getEmail() != null && !request.getEmail().isBlank()
                ? request.getEmail()
                : request.getUsername() + "@techstore.com";
        if (authUserRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El correo '" + email + "' ya está registrado");
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("USER").build()));

        String nombreCompleto = request.getNombreCompleto() != null && !request.getNombreCompleto().isBlank()
                ? request.getNombreCompleto()
                : request.getUsername();

        AuthUser nuevo = AuthUser.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .nombreCompleto(nombreCompleto)
                .email(email)
                .nombres(nombreCompleto.contains(" ") ? nombreCompleto.substring(0, nombreCompleto.indexOf(' ')) : nombreCompleto)
                .apellidos(nombreCompleto.contains(" ") ? nombreCompleto.substring(nombreCompleto.indexOf(' ') + 1) : "")
                .enabled(true)
                .roles(Set.of(userRole))
                .build();
        AuthUser saved = authUserRepository.save(nuevo);

        return AuthRegisterResponse.builder()
                .id(saved.getId())
                .username(saved.getUsername())
                .roles(saved.getRoles().stream().map(Role::getName).toList())
                .nombreCompleto(saved.getNombreCompleto())
                .email(saved.getEmail())
                .build();
    }
}
