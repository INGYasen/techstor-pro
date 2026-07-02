package com.upeu.auth.service;

import com.upeu.auth.dto.ProfileUpdateRequest;
import com.upeu.auth.dto.UserCreateRequest;
import com.upeu.auth.dto.UserDto;
import com.upeu.auth.dto.UserUpdateRequest;
import com.upeu.auth.entity.AuthUser;
import com.upeu.auth.entity.Role;
import com.upeu.auth.repository.AuthUserRepository;
import com.upeu.auth.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserService {

    private final AuthUserRepository authUserRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDto> listar() {
        return authUserRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    public UserDto obtener(Long id) {
        return toDto(findUser(id));
    }

    @Transactional
    public UserDto crear(UserCreateRequest request) {
        if (authUserRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El usuario '" + request.getUsername() + "' ya existe");
        }
        if (authUserRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El correo '" + request.getEmail() + "' ya está registrado");
        }

        Role role = resolveRole(request.getRole());
        AuthUser user = AuthUser.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .nombreCompleto(request.getNombreCompleto())
                .email(request.getEmail())
                .enabled(Boolean.TRUE.equals(request.getEnabled()))
                .roles(Set.of(role))
                .build();

        return toDto(authUserRepository.save(user));
    }

    @Transactional
    public UserDto actualizar(Long id, UserUpdateRequest request) {
        AuthUser user = findUser(id);

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())
                && authUserRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El correo '" + request.getEmail() + "' ya está registrado");
        }

        if (request.getNombreCompleto() != null) {
            user.setNombreCompleto(request.getNombreCompleto());
        }
        if (request.getEmail() != null) {
            user.setEmail(request.getEmail());
        }
        if (request.getEnabled() != null) {
            user.setEnabled(request.getEnabled());
        }
        if (request.getRole() != null) {
            user.setRoles(Set.of(resolveRole(request.getRole())));
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        return toDto(authUserRepository.save(user));
    }

    @Transactional
    public void eliminar(Long id, String currentUsername) {
        AuthUser user = findUser(id);
        if (user.getUsername().equals(currentUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No puedes eliminar tu propio usuario");
        }
        authUserRepository.delete(user);
    }

    public UserDto obtenerPorUsername(String username) {
        return authUserRepository.findByUsername(username)
                .map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    @Transactional
    public UserDto actualizarPerfil(String username, ProfileUpdateRequest request) {
        AuthUser user = authUserRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())
                && authUserRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El correo '" + request.getEmail() + "' ya está registrado");
        }

        if (request.getNombres() != null) user.setNombres(request.getNombres());
        if (request.getApellidos() != null) user.setApellidos(request.getApellidos());
        if (request.getNombreCompleto() != null) user.setNombreCompleto(request.getNombreCompleto());
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        if (request.getDni() != null) user.setDni(request.getDni());
        if (request.getFechaNacimiento() != null) user.setFechaNacimiento(request.getFechaNacimiento());
        if (request.getSexo() != null) user.setSexo(request.getSexo());
        if (request.getTelefono() != null) user.setTelefono(request.getTelefono());
        if (request.getPais() != null) user.setPais(request.getPais());
        if (request.getDepartamento() != null) user.setDepartamento(request.getDepartamento());
        if (request.getProvincia() != null) user.setProvincia(request.getProvincia());
        if (request.getDistrito() != null) user.setDistrito(request.getDistrito());
        if (request.getCodigoPostal() != null) user.setCodigoPostal(request.getCodigoPostal());
        if (request.getDireccion() != null) user.setDireccion(request.getDireccion());
        if (request.getReferencia() != null) user.setReferencia(request.getReferencia());

        if ((request.getNombres() != null || request.getApellidos() != null)
                && request.getNombreCompleto() == null) {
            String nombres = user.getNombres() != null ? user.getNombres() : "";
            String apellidos = user.getApellidos() != null ? user.getApellidos() : "";
            String completo = (nombres + " " + apellidos).trim();
            if (!completo.isBlank()) {
                user.setNombreCompleto(completo);
            }
        }

        return toDto(authUserRepository.save(user));
    }

    private AuthUser findUser(Long id) {
        return authUserRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }

    private Role resolveRole(String roleName) {
        return roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Rol inválido: " + roleName));
    }

    private UserDto toDto(AuthUser user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nombreCompleto(user.getNombreCompleto() != null ? user.getNombreCompleto() : user.getUsername())
                .email(user.getEmail() != null ? user.getEmail() : user.getUsername() + "@techstore.com")
                .nombres(user.getNombres())
                .apellidos(user.getApellidos())
                .dni(user.getDni())
                .fechaNacimiento(user.getFechaNacimiento())
                .sexo(user.getSexo())
                .telefono(user.getTelefono())
                .pais(user.getPais())
                .departamento(user.getDepartamento())
                .provincia(user.getProvincia())
                .distrito(user.getDistrito())
                .codigoPostal(user.getCodigoPostal())
                .direccion(user.getDireccion())
                .referencia(user.getReferencia())
                .roles(user.getRoles().stream().map(Role::getName).toList())
                .enabled(user.isEnabled())
                .build();
    }
}
