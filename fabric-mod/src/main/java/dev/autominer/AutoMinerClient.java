package dev.autominer;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keybinding.v1.KeyBindingHelper;
import net.fabricmc.fabric.api.client.rendering.v1.HudRenderCallback;
import net.minecraft.client.option.KeyBinding;
import net.minecraft.client.util.InputUtil;
import org.lwjgl.glfw.GLFW;

public final class AutoMinerClient implements ClientModInitializer {
    private AutoMinerController controller;
    @Override public void onInitializeClient() {
        var config = new ConfigManager().load();
        controller = new AutoMinerController(config);
        var toggle = KeyBindingHelper.registerKeyBinding(new KeyBinding("key.autominer.toggle", InputUtil.Type.KEYSYM, GLFW.GLFW_KEY_F6, "category.autominer"));
        ClientTickEvents.END_CLIENT_TICK.register(client -> { while (toggle.wasPressed()) controller.toggle(client); controller.tick(client); });
        HudRenderCallback.EVENT.register((context, tickCounter) -> controller.renderHud(context));
        Runtime.getRuntime().addShutdownHook(new Thread(controller::close));
    }
}
