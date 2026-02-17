import { useState } from "react";
import { Plus, Trash2, Camera, Users } from "lucide-react";
import { useAppStore } from "~/app/lib/store";
import type { Character } from "~/app/types";

export function CastManager({ guided }: { guided?: boolean }) {
  const { characters, addCharacter, updateCharacter, removeCharacter } = useAppStore();

  const handleAdd = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: "New Character",
      description: "",
      photoUrl: null,
    };
    addCharacter(newChar);
  };

  const handlePhotoUpload = (charId: string, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateCharacter(charId, { photoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white mb-1">Ready to Cast</h2>
          <p className="text-stone-400 text-sm">Define your characters and upload reference photos for visual consistency.</p>
          {guided && characters.length === 0 && (
            <div className="mt-2 text-emerald-400 text-xs font-semibold">Add your first character to begin your production journey.</div>
          )}
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors animate-bounce"
        >
          <Plus className="w-4 h-4" />
          Add Character
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {characters.map((char) => (
          <div
            key={char.id}
            className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden hover:border-stone-700 transition-colors group"
          >
            {/* Photo Area */}
            <div className="aspect-video bg-stone-950 relative overflow-hidden">
              {char.photoUrl ? (
                <img src={char.photoUrl} alt={char.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-900">
                  <Users className="w-14 h-14 text-stone-700" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <label className="cursor-pointer bg-emerald-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-emerald-500 transition-colors text-sm">
                  <Camera className="w-4 h-4" />
                  Upload Photo
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(char.id, e.target.files[0])}
                  />
                </label>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={char.name}
                onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                className="w-full bg-transparent text-white font-serif text-lg font-semibold border-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-1 -ml-1"
                placeholder="Character Name"
              />
              <textarea
                value={char.description}
                onChange={(e) => updateCharacter(char.id, { description: e.target.value })}
                className="w-full bg-stone-950 text-stone-400 text-sm border border-stone-800 rounded-lg p-2.5 focus:outline-none focus:border-emerald-500/50 resize-none h-20"
                placeholder="Physical description, personality, wardrobe details..."
              />
              <div className="flex justify-end">
                <button
                  onClick={() => removeCharacter(char.id)}
                  className="text-stone-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {characters.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-stone-800 rounded-xl">
            <Users className="w-12 h-12 text-stone-700 mx-auto mb-4" />
            <p className="text-stone-500">No cast members yet. Add characters to begin production.</p>
          </div>
        )}
      </div>
    </div>
  );
}
