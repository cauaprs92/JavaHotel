package com.hotel.controller;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.hotel.service.HotelService;

@Controller
public class HotelController {

    @Autowired
    private HotelService hotelService;

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("quartos", hotelService.listarQuartos());
        model.addAttribute("produtos", hotelService.listarProdutos());
        return "index";
    }

    @PostMapping("/reservar")
    public String reservar(@RequestParam int numero,
                            @RequestParam String nome,
                            @RequestParam String email,
                            @RequestParam String telefone,
                            RedirectAttributes redirect) {
        String mensagem = hotelService.reservar(numero, nome, email, telefone);
        redirect.addFlashAttribute("mensagem", mensagem);
        return "redirect:/";
    }

    @PostMapping("/cancelar")
    public String cancelar(@RequestParam int numero, RedirectAttributes redirect) {
        String mensagem = hotelService.cancelar(numero);
        redirect.addFlashAttribute("mensagem", mensagem);
        return "redirect:/";
    }

    @PostMapping("/consumo")
    public String consumo(@RequestParam int numero,
                           @RequestParam int produto,
                           @RequestParam int quantidade,
                           RedirectAttributes redirect) {
        String mensagem = hotelService.registrarConsumo(numero, produto, quantidade);
        redirect.addFlashAttribute("mensagem", mensagem);
        return "redirect:/";
    }
}
