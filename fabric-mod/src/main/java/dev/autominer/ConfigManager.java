package dev.autominer;

import com.google.gson.*;
import net.fabricmc.loader.api.FabricLoader;
import java.io.*;
import java.nio.file.*;

public final class ConfigManager {
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private final Path path = FabricLoader.getInstance().getConfigDir().resolve("autominer.json");
    public synchronized AutoMinerConfig load() {
        try { if (Files.exists(path)) { var value=gson.fromJson(Files.readString(path),AutoMinerConfig.class); value.validate(); return value; } }
        catch (Exception ignored) {}
        var value=new AutoMinerConfig(); save(value); return value;
    }
    public synchronized void save(AutoMinerConfig value) { try { value.validate(); Files.createDirectories(path.getParent()); Files.writeString(path,gson.toJson(value)); } catch(IOException e){ throw new UncheckedIOException(e); } }
    public Gson gson(){ return gson; }
}
