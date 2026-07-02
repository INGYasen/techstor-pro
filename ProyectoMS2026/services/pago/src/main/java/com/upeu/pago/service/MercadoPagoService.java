package com.upeu.pago.service;

import com.upeu.pago.dto.MercadoPagoConfigResponse;
import com.upeu.pago.dto.MercadoPagoTarjetaRequest;
import com.upeu.pago.dto.MercadoPagoYapeRequest;
import com.upeu.pago.dto.MercadoPagoYapeResponse;

public interface MercadoPagoService {

	MercadoPagoConfigResponse obtenerConfiguracion();

	MercadoPagoYapeResponse cobrarConYape(MercadoPagoYapeRequest request);

	MercadoPagoYapeResponse cobrarConTarjeta(MercadoPagoTarjetaRequest request);
}
