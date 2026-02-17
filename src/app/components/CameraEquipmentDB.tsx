import { useState, useRef, type ReactNode } from "react";
import { Check, Camera, Aperture, Sun, Sparkles, Video, Clapperboard, Smartphone, Plane, Film } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import { CAMERAS, LENSES, LIGHTING } from "~/app/lib/anthologies";

type EquipmentTab = "cameras" | "lenses" | "lighting";

// Equipment icon mapping for visual identification
const CAMERA_ICONS: Record<string, { icon: typeof Camera; emoji: string }> = {
  "Cinema": { icon: Video, emoji: "🎬" },
  "Prosumer": { icon: Clapperboard, emoji: "📹" },
  "Action": { icon: Smartphone, emoji: "📱" },
  "Drone": { icon: Plane, emoji: "🚁" },
  "Film Stock": { icon: Film, emoji: "🎞️" },
};

const LENS_ICONS: Record<string, string> = {
  "Prime": "🔭",
  "Anamorphic": "🌊",
  "Specialty": "🔬",
  "Vintage": "📷",
};

// ============================================================
// HOVER PREVIEW CARD — shows rotating icon + specs on hover
// ============================================================

function EquipmentHoverCard({
  children,
  icon: Icon,
  emoji,
  name,
  specs,
  color = "blue",
}: {
  children: ReactNode;
  icon: typeof Camera;
  emoji: string;
  name: string;
  specs: { label: string; value: string }[];
  color?: "blue" | "amber" | "yellow";
}) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const colorMap = {
    blue:   { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   iconBg: "bg-blue-500/20" },
    amber:  { bg: "bg-amber-500/10",  border: "border-amber-500/30",  text: "text-amber-400",  iconBg: "bg-amber-500/20" },
    yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", iconBg: "bg-yellow-500/20" },
  };
  const c = colorMap[color];

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(true), 350);
  };
  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(false), 150);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}

      {show && (
        <div
          className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 ${c.bg} ${c.border} border backdrop-blur-xl rounded-xl p-4 shadow-2xl shadow-black/50 pointer-events-none`}
          style={{ animation: "fadeIn 0.15s ease-out" }}
        >
          {/* Rotating icon */}
          <div className="flex flex-col items-center mb-3">
            <div className={`w-16 h-16 rounded-2xl ${c.iconBg} flex items-center justify-center equipment-float`}>
              <div className="equipment-rotate">
                <Icon className={`w-8 h-8 ${c.text}`} />
              </div>
            </div>
            <span className="text-lg mt-1">{emoji}</span>
          </div>

          {/* Name */}
          <p className={`text-xs font-semibold ${c.text} text-center mb-2 leading-tight`}>{name}</p>

          {/* Specs */}
          <div className="space-y-1">
            {specs.map((s) => (
              <div key={s.label} className="flex items-center justify-between text-[10px]">
                <span className="text-stone-500 uppercase tracking-wider">{s.label}</span>
                <span className="text-stone-300 font-medium">{s.value}</span>
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent ${
            color === "blue" ? "border-t-blue-500/30" : color === "amber" ? "border-t-amber-500/30" : "border-t-yellow-500/30"
          }`} />
        </div>
      )}
    </div>
  );
}

/** Build specs array for a camera item */
function buildCameraSpecs(cam: (typeof allCameras)[number]): { label: string; value: string }[] {
  const specs: { label: string; value: string }[] = [];
  if ("sensor" in cam) specs.push({ label: "Sensor", value: cam.sensor });
  if ("format" in cam) specs.push({ label: "Format", value: cam.format });
  if ("dr" in cam) specs.push({ label: "Dynamic Range", value: cam.dr as string });
  if ("iso" in cam) specs.push({ label: "ISO", value: String(cam.iso) });
  if ("look" in cam) specs.push({ label: "Look", value: (cam.look as string).substring(0, 40) });
  return specs;
}

/** Build specs array for a lens item */
function buildLensSpecs(lens: (typeof allLenses)[number]): { label: string; value: string }[] {
  return [
    { label: "Character", value: lens.character.substring(0, 45) },
    { label: "Category", value: lens.category },
  ];
}

// Flatten camera data for easier rendering
const allCameras = [
  ...CAMERAS.cinema.map((c) => ({ ...c, category: "Cinema" })),
  ...CAMERAS.prosumer.map((c) => ({ ...c, category: "Prosumer" })),
  ...CAMERAS.action.map((c) => ({ ...c, category: "Action" })),
  ...CAMERAS.drone.map((c) => ({ ...c, category: "Drone" })),
  ...CAMERAS.film.map((c) => ({ ...c, category: "Film Stock" })),
];

const allLenses = [
  ...LENSES.primes.map((l) => ({ ...l, category: "Prime" })),
  ...LENSES.anamorphic.map((l) => ({ ...l, category: "Anamorphic" })),
  ...LENSES.specialty.map((l) => ({ ...l, category: "Specialty" })),
  ...LENSES.vintage.map((l) => ({ ...l, category: "Vintage" })),
];

const lightingStyles = LIGHTING.styles.map((s) => ({ ...s, promptHints: s.desc }));

export function CameraEquipmentDB() {
  const { equipmentSelections, setEquipmentSelections, setActiveTab } = useAppStore();
  const [activeTab, setLocalTab] = useState<EquipmentTab>("cameras");

  const handleSelectCamera = (id: string) => {
    const isDeselect = equipmentSelections.cameraId === id;
    const newHints = buildEquipmentHints(
      isDeselect ? null : id,
      equipmentSelections.lensId,
      equipmentSelections.lightingStyleId
    );
    setEquipmentSelections({
      cameraId: isDeselect ? null : id,
      promptHints: newHints,
    });
  };

  const handleSelectLens = (id: string) => {
    const isDeselect = equipmentSelections.lensId === id;
    const newHints = buildEquipmentHints(
      equipmentSelections.cameraId,
      isDeselect ? null : id,
      equipmentSelections.lightingStyleId
    );
    setEquipmentSelections({
      lensId: isDeselect ? null : id,
      promptHints: newHints,
    });
  };

  const handleSelectLighting = (id: string) => {
    const isDeselect = equipmentSelections.lightingStyleId === id;
    const newHints = buildEquipmentHints(
      equipmentSelections.cameraId,
      equipmentSelections.lensId,
      isDeselect ? null : id
    );
    setEquipmentSelections({
      lightingStyleId: isDeselect ? null : id,
      promptHints: newHints,
    });
  };

  const selectedCamera = allCameras.find((c) => c.id === equipmentSelections.cameraId);
  const selectedLens = allLenses.find((l) => l.id === equipmentSelections.lensId);
  const selectedLighting = lightingStyles.find((l) => l.id === equipmentSelections.lightingStyleId);

  const hasSelections = equipmentSelections.cameraId || equipmentSelections.lensId || equipmentSelections.lightingStyleId;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-1">Equipment Setup</h2>
          <p className="text-stone-400 text-sm">
            Select your camera body, lens, and lighting style. These inform the visual rendering of every scene.
          </p>
        </div>
        <button
          onClick={() => setActiveTab("production")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Continue to Render
        </button>
      </div>

      {/* Current Selections Summary */}
      {hasSelections && (
        <div className="bg-stone-900 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-wider text-blue-400 font-medium mb-3">
            Equipment Configuration
          </h3>
          <div className="flex flex-wrap gap-3">
            {selectedCamera && (
              <div className="flex items-center gap-2 bg-blue-500/10 text-blue-300 px-3 py-1.5 rounded-lg text-sm">
                <Camera className="w-3.5 h-3.5" />
                <span className="font-medium">{selectedCamera.name}</span>
                <span className="text-blue-500/60">·</span>
                <span className="text-xs text-blue-400/70">{"sensor" in selectedCamera ? selectedCamera.sensor : "format" in selectedCamera ? selectedCamera.format : ""}</span>
              </div>
            )}
            {selectedLens && (
              <div className="flex items-center gap-2 bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-lg text-sm">
                <Aperture className="w-3.5 h-3.5" />
                <span className="font-medium">{selectedLens.name}</span>
              </div>
            )}
            {selectedLighting && (
              <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-300 px-3 py-1.5 rounded-lg text-sm">
                <Sun className="w-3.5 h-3.5" />
                <span className="font-medium">{selectedLighting.name}</span>
              </div>
            )}
          </div>
          {equipmentSelections.promptHints.length > 0 && (
            <div className="mt-3 bg-stone-950 rounded-lg p-3">
              <p className="text-[11px] text-stone-500">
                <span className="text-stone-400 font-medium">Prompt injection: </span>
                {equipmentSelections.promptHints.join(". ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Equipment Tabs */}
      <div className="flex gap-2 border-b border-stone-800 pb-3">
        <button
          onClick={() => setLocalTab("cameras")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "cameras"
              ? "bg-blue-600 text-white"
              : "bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800"
          }`}
        >
          <Camera className="w-4 h-4 inline mr-1.5" />
          Cameras
        </button>
        <button
          onClick={() => setLocalTab("lenses")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "lenses"
              ? "bg-amber-600 text-white"
              : "bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800"
          }`}
        >
          <Aperture className="w-4 h-4 inline mr-1.5" />
          Lenses
        </button>
        <button
          onClick={() => setLocalTab("lighting")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "lighting"
              ? "bg-yellow-600 text-white"
              : "bg-stone-900 text-stone-400 hover:text-white hover:bg-stone-800"
          }`}
        >
          <Sun className="w-4 h-4 inline mr-1.5" />
          Lighting Styles
        </button>
      </div>

      {/* Cameras */}
      {activeTab === "cameras" && (
        <div>
          {(["Cinema", "Prosumer", "Action", "Drone", "Film Stock"] as const).map((cat) => {
            const group = allCameras.filter((c) => c.category === cat);
            return (
              <div key={cat} className="mb-6">
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>{CAMERA_ICONS[cat]?.emoji || "📷"}</span> {cat}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map((cam) => {
                    const isSelected = equipmentSelections.cameraId === cam.id;
                    const CatIcon = CAMERA_ICONS[cat]?.icon || Camera;
                    return (
                      <button
                        key={cam.id}
                        onClick={() => handleSelectCamera(cam.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-blue-500/50 bg-blue-500/5 ring-2 ring-blue-500/20"
                            : "border-stone-800 hover:border-stone-600 bg-stone-900"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <EquipmentHoverCard
                              icon={CatIcon}
                              emoji={CAMERA_ICONS[cat]?.emoji || "📷"}
                              name={cam.name}
                              specs={buildCameraSpecs(cam)}
                              color="blue"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-help ${isSelected ? "bg-blue-500/20" : "bg-stone-800"}`}>
                                <CatIcon className={`w-4 h-4 ${isSelected ? "text-blue-400" : "text-stone-500"}`} />
                              </div>
                            </EquipmentHoverCard>
                            <span className="text-white font-medium text-sm">{cam.name}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="flex gap-2 text-xs text-stone-500 mb-1.5">
                          {"sensor" in cam && <span>{cam.sensor}</span>}
                          {"format" in cam && <span>{cam.format}</span>}
                          {"dr" in cam && <span>· {cam.dr} DR</span>}
                          {"iso" in cam && <span>· ISO {cam.iso}</span>}
                        </div>
                        <p className="text-xs text-stone-400 mb-2">{"look" in cam ? cam.look : ""}</p>
                        {"promptHints" in cam && (
                          <div className="bg-stone-950 rounded px-2 py-1">
                            <p className="text-[10px] text-stone-500">{cam.promptHints}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lenses */}
      {activeTab === "lenses" && (
        <div>
          {(["Prime", "Anamorphic", "Specialty", "Vintage"] as const).map((cat) => {
            const group = allLenses.filter((l) => l.category === cat);
            return (
              <div key={cat} className="mb-6">
                <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>{LENS_ICONS[cat] || "🔭"}</span> {cat}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map((lens) => {
                    const isSelected = equipmentSelections.lensId === lens.id;
                    return (
                      <button
                        key={lens.id}
                        onClick={() => handleSelectLens(lens.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          isSelected
                            ? "border-amber-500/50 bg-amber-500/5 ring-2 ring-amber-500/20"
                            : "border-stone-800 hover:border-stone-600 bg-stone-900"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <EquipmentHoverCard
                              icon={Aperture}
                              emoji={LENS_ICONS[cat] || "🔭"}
                              name={lens.name}
                              specs={buildLensSpecs(lens)}
                              color="amber"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-help ${isSelected ? "bg-amber-500/20" : "bg-stone-800"}`}>
                                <Aperture className={`w-4 h-4 ${isSelected ? "text-amber-400" : "text-stone-500"}`} />
                              </div>
                            </EquipmentHoverCard>
                            <span className="text-white font-medium text-sm">{lens.name}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <p className="text-xs text-stone-400 mb-2">{lens.character}</p>
                        <div className="bg-stone-950 rounded px-2 py-1">
                          <p className="text-[10px] text-stone-500">{lens.promptHints}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lighting Styles */}
      {activeTab === "lighting" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {lightingStyles.map((style) => {
            const isSelected = equipmentSelections.lightingStyleId === style.id;
            return (
              <button
                key={style.id}
                onClick={() => handleSelectLighting(style.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-yellow-500/50 bg-yellow-500/5 ring-2 ring-yellow-500/20"
                    : "border-stone-800 hover:border-stone-600 bg-stone-900"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-yellow-500/20" : "bg-stone-800"}`}>
                      <Sun className={`w-4 h-4 ${isSelected ? "text-yellow-400" : "text-stone-500"}`} />
                    </div>
                    <span className="text-white font-medium text-sm">{style.name}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-yellow-400" />}
                </div>
                <p className="text-xs text-stone-400">{style.desc}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Build aggregated prompt hints from equipment selections */
function buildEquipmentHints(
  cameraId: string | null,
  lensId: string | null,
  lightingId: string | null
): string[] {
  const hints: string[] = [];

  if (cameraId) {
    const allCams = [
      ...CAMERAS.cinema, ...CAMERAS.prosumer, ...CAMERAS.action, ...CAMERAS.drone, ...CAMERAS.film,
    ];
    const cam = allCams.find((c) => c.id === cameraId);
    if (cam && "promptHints" in cam) hints.push(cam.promptHints);
  }

  if (lensId) {
    const allL = [...LENSES.primes, ...LENSES.anamorphic, ...LENSES.specialty, ...LENSES.vintage];
    const lens = allL.find((l) => l.id === lensId);
    if (lens) hints.push(lens.promptHints);
  }

  if (lightingId) {
    const style = LIGHTING.styles.find((s) => s.id === lightingId);
    if (style) hints.push(style.desc);
  }

  return hints;
}
