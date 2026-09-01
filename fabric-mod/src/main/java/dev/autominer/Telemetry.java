package dev.autominer;
import java.util.*;
public final class Telemetry {
  public String state="STOPPED"; public boolean online=true; public int blocksBroken; public long activeSeconds; public double speed;
  public int corridor; public int corridorCount; public String areaPhase="NONE";
  public Vec player=new Vec(); public Cam camera=new Cam(); public Target target; public List<Target> history=new ArrayList<>(); public String lastError;
  public record Vec(double x,double y,double z){ public Vec(){this(0,0,0);} }
  public record Cam(double yaw,double pitch){ public Cam(){this(0,0);} }
  public record Target(String id,Vec position,double distance){}
}
