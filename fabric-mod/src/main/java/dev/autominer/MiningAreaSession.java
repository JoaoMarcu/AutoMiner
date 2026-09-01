package dev.autominer;

import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.Vec3d;

/** Fixed mining area captured when the run starts. It never follows the player. */
public final class MiningAreaSession {
  public enum Phase { CORRIDOR, TURNING, RETURNING, COMPLETE }

  private final Vec3d origin;
  private final Vec3d forward;
  private final Vec3d right;
  private final int depth;
  private final int corridorWidth;
  private final int corridorCount;
  private int corridor;
  private Phase phase = Phase.CORRIDOR;

  public MiningAreaSession(Vec3d origin, float yaw, int depth, int lateralRange) {
    this.origin = origin;
    this.forward = Vec3d.fromPolar(0, yaw).normalize();
    this.right = new Vec3d(-forward.z, 0, forward.x).normalize();
    this.depth = Math.max(1, depth);
    this.corridorWidth = Math.max(2, Math.min(3, lateralRange));
    this.corridorCount = Math.max(1, (lateralRange * 2 + 1 + corridorWidth - 1) / corridorWidth);
  }

  public Vec3d origin() { return origin; }
  public Vec3d forward() { return forward; }
  public int corridor() { return corridor; }
  public int corridorCount() { return corridorCount; }
  public Phase phase() { return phase; }
  public boolean complete() { return phase == Phase.COMPLETE; }

  public boolean contains(BlockPos pos, double verticalUp, double verticalDown) {
    Vec3d delta = Vec3d.ofCenter(pos).subtract(origin);
    double progress = delta.x * forward.x + delta.z * forward.z;
    double lateral = delta.x * right.x + delta.z * right.z;
    double minLateral = -corridorWidth + corridor * corridorWidth;
    double maxLateral = minLateral + corridorWidth;
    return progress >= 0 && progress <= depth && lateral >= minLateral && lateral < maxLateral
      && delta.y <= verticalUp && -delta.y <= verticalDown;
  }

  public void nextCorridor() {
    if (phase != Phase.CORRIDOR) return;
    if (corridor + 1 < corridorCount) { corridor++; phase = Phase.TURNING; }
    else phase = Phase.RETURNING;
  }

  public void beginCorridor() { if (phase == Phase.TURNING) phase = Phase.CORRIDOR; }
  public void finishReturn() { phase = Phase.COMPLETE; }
}
