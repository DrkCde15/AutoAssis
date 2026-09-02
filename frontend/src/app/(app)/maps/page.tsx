"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser, authFetch } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  MapPin,
  Search,
  Star,
  Phone,
  MessageCircle,
  Heart,
  X,
  Loader2,
  Crown,
  Clock,
  Navigation,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

interface Mechanic {
  id: number | string;
  name?: string;
  nome?: string;
  address?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  phone?: string;
  telefone?: string;
  rating?: number;
  avaliacao_media?: number;
  total_avaliacoes?: number;
  distance?: number;
  distance_km?: number;
  specialties?: string[];
  especialidades?: string[];
  services?: string[];
  servicos?: { nome: string; preco?: number }[];
  horario_funcionamento?: any;
  latitude?: number;
  longitude?: number;
  descricao?: string;
  email?: string;
  website?: string;
  is_verified?: boolean;
}

interface Favorite {
  id: number;
  mechanic_id: number;
}

const SPECIALTIES = [
  { id: "troca_oleo", label: "Troca de Oleo" },
  { id: "freios", label: "Freios" },
  { id: "suspensao", label: "Suspensao" },
  { id: "eletrica", label: "Eletrica" },
  { id: "pneus", label: "Pneus" },
  { id: "arrefecimento", label: "Arrefecimento" },
  { id: "motor", label: "Motor" },
];

function formatService(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let stars = "";
  for (let i = 0; i < 5; i++) {
    if (i < full || (i === full && half)) stars += "\u2605";
    else stars += "\u2606";
  }
  return stars;
}

function whatsappLink(telefone: string): string {
  let digits = String(telefone || "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits ? `https://wa.me/${digits}` : "#";
}

function getName(m: Mechanic) {
  return m.name || m.nome || "Mecanico";
}
function getAddress(m: Mechanic) {
  if (m.address) return m.address;
  return [m.endereco, m.cidade, m.estado].filter(Boolean).join(", ");
}
function getPhone(m: Mechanic) {
  return m.phone || m.telefone || "";
}
function getRating(m: Mechanic) {
  return m.rating || m.avaliacao_media || 0;
}
function getDistance(m: Mechanic) {
  return m.distance || m.distance_km || 0;
}
function getSpecs(m: Mechanic) {
  return m.specialties || m.especialidades || [];
}

function cloneMechanic(m: Mechanic): Mechanic {
  return {
    id: m.id,
    name: getName(m),
    address: getAddress(m),
    phone: getPhone(m),
    rating: getRating(m),
    total_avaliacoes: m.total_avaliacoes,
    distance: getDistance(m),
    specialties: getSpecs(m),
    servicos: m.servicos,
    horario_funcionamento: m.horario_funcionamento,
    latitude: m.latitude,
    longitude: m.longitude,
    descricao: m.descricao,
    email: m.email,
    website: m.website,
    is_verified: m.is_verified,
  };
}

export default function MapsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState("");
  const [radius, setRadius] = useState("10");
  const [minRating, setMinRating] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("search");
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searching, setSearching] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState("");

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const favoritesRef = useRef<Favorite[]>([]);

  favoritesRef.current = favorites;

  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = await getUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        setIsPremium(currentUser.is_premium ?? false);

        if (!currentUser.is_premium) {
          setLoading(false);
          return;
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            () => {
              setLocationError("Permita o acesso a localizacao para buscar oficinas proximas.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        } else {
          setLocationError("Seu navegador nao suporta geolocalizacao.");
        }

        const favRes = await authFetch("/api/mechanics/favorites");
        if (favRes.ok) {
          const favData = await favRes.json();
          setFavorites(favData.favorites ?? favData ?? []);
        }
      } catch (error) {
        console.error("Failed to initialize maps:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (!mapRef.current || !isPremium || loading) return;

    const initMap = async () => {
      if (leafletMap.current) return;

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const center: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [-23.5505, -46.6333];

      leafletMap.current = L.map(mapRef.current!, { zoomControl: false }).setView(
        center,
        userLocation ? 13 : 12
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "\u00a9 OpenStreetMap contributors",
      }).addTo(leafletMap.current);
    };

    initMap();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [isPremium, loading]);

  useEffect(() => {
    if (leafletMap.current && userLocation) {
      leafletMap.current.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation]);

  const updateMapMarkers = useCallback(async (results: Mechanic[]) => {
    if (!leafletMap.current) return;
    const L = (await import("leaflet")).default;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    results.forEach((m) => {
      if (!m.latitude || !m.longitude) return;
      const isFav = favoritesRef.current.some((f) => f.mechanic_id === m.id);
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:${isFav ? "#ef4444" : "#f59e0b"};border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const clean = cloneMechanic(m);
      const marker = L.marker([m.latitude, m.longitude], { icon })
        .addTo(leafletMap.current!)
        .on("click", () => {
          setSelectedMechanic(clean);
          setShowDetail(true);
        });

      markersRef.current.push(marker);
    });

    if (results.length > 0) {
      const bounds = L.latLngBounds(
        results
          .filter((m) => m.latitude && m.longitude)
          .map((m) => [m.latitude!, m.longitude!] as [number, number])
      );
      if (bounds.isValid()) {
        leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, []);

  const doSearch = useCallback(async () => {
    if (!userLocation) {
      setLocationError("Permita o acesso a localizacao para buscar oficinas proximas.");
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      params.set("lat", String(userLocation.lat));
      params.set("lng", String(userLocation.lng));
      if (radius) params.set("radius", radius);
      if (serviceType) params.set("service_type", serviceType);
      if (minRating) params.set("min_rating", minRating);

      const response = await authFetch(`/api/mechanics/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const results = data.mechanics ?? data ?? [];
        setMechanics(results);
        updateMapMarkers(results);
      }
    } catch (error) {
      console.error("Failed to search mechanics:", error);
    } finally {
      setSearching(false);
    }
  }, [userLocation, radius, serviceType, minRating, updateMapMarkers]);

  useEffect(() => {
    if (userLocation && isPremium) {
      doSearch();
    }
  }, [userLocation, isPremium]);

  const toggleFavorite = async (mechanicId: number | string) => {
    const isFav = favorites.some((f) => f.mechanic_id === mechanicId);
    try {
      if (isFav) {
        await authFetch(`/api/mechanics/${mechanicId}/favorite`, { method: "DELETE" });
        setFavorites((prev) => prev.filter((f) => f.mechanic_id !== mechanicId));
      } else {
        const res = await authFetch(`/api/mechanics/${mechanicId}/favorite`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setFavorites((prev) => [...prev, data]);
        }
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const submitReview = async (mechanicId: number | string) => {
    try {
      await authFetch(`/api/mechanics/${mechanicId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, comment: reviewText }),
      });
      setReviewText("");
      setReviewRating(5);
      setShowDetail(false);
    } catch (error) {
      console.error("Failed to submit review:", error);
    }
  };

  const toggleSpecialty = (id: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const favoriteMechanics = mechanics.filter((m) =>
    favorites.some((f) => f.mechanic_id === m.id)
  );

  const displayedMechanics = activeTab === "favorites" ? favoriteMechanics : mechanics;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Crown className="w-16 h-16 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-2">Recurso Premium</h1>
          <p className="text-secondary mb-6">
            Assine o plano premium para acessar o mapa de mecanicos e oficinas verificadas.
          </p>
          <Link href="/perfil">
            <Button className="w-full">
              <Crown className="w-4 h-4 mr-2" />
              Ver Planos
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-full lg:w-[420px] bg-secondary border-r border-border flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-border space-y-4">
            <div className="flex gap-2">
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="flex-1 bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Tipo de servico</option>
                <option value="mecanico">Mecanico</option>
                <option value="eletrica">Eletrica</option>
                <option value="funilaria">Funilaria</option>
                <option value="borracharia">Borracharia</option>
              </select>

              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="w-24 bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="20">20 km</option>
                <option value="50">50 km</option>
              </select>

              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="w-20 bg-primary border border-border rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Nota</option>
                <option value="4">4+</option>
                <option value="3">3+</option>
                <option value="2">2+</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSpecialty(s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedSpecialties.includes(s.id)
                      ? "bg-accent text-white"
                      : "bg-primary border border-border text-secondary hover:border-accent"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Button onClick={doSearch} className="w-full" disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Buscar
            </Button>

            {locationError && <p className="text-xs text-warning mt-2">{locationError}</p>}
          </div>

          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "search" ? "text-accent border-b-2 border-accent" : "text-muted hover:text-secondary"
              }`}
            >
              Mecanicos ({mechanics.length})
            </button>
            <button
              onClick={() => setActiveTab("favorites")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "favorites" ? "text-accent border-b-2 border-accent" : "text-muted hover:text-secondary"
              }`}
            >
              Favoritos ({favoriteMechanics.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {displayedMechanics.length === 0 ? (
              <div className="p-8 text-center">
                <MapPin className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-sm text-muted">
                  {activeTab === "favorites" ? "Nenhum favorito ainda" : "Nenhum mecanico encontrado"}
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {displayedMechanics.map((m) => {
                  const name = getName(m);
                  const address = getAddress(m);
                  const phone = getPhone(m);
                  const rating = getRating(m);
                  const distance = getDistance(m);
                  const specs = getSpecs(m);
                  const isFav = favorites.some((f) => f.mechanic_id === m.id);

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedMechanic(cloneMechanic(m));
                        setShowDetail(true);
                      }}
                      className="group rounded-xl border border-border bg-primary p-4 cursor-pointer transition-all duration-200 hover:border-accent/50 hover:shadow-[0_0_0_1px_rgba(59,130,246,0.1),0_4px_12px_rgba(0,0,0,0.2)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-primary truncate text-[15px]">{name}</h3>
                            {m.is_verified && <CheckCircle className="w-4 h-4 text-accent shrink-0" />}
                          </div>
                          <p className="text-sm text-secondary truncate mt-1">{address}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(m.id); }}
                          className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-danger/10"
                        >
                          <Heart className={`w-4 h-4 transition-colors ${isFav ? "text-danger fill-danger" : "text-muted"}`} />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        {rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                            <span className="text-sm font-medium text-primary">{Number(rating).toFixed(1)}</span>
                          </div>
                        ) : null}
                        {distance ? (
                          <div className="flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5 text-muted" />
                            <span className="text-sm text-muted">{Number(distance).toFixed(1)} km</span>
                          </div>
                        ) : null}
                      </div>

                      {specs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {specs.slice(0, 3).map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                              {formatService(s)}
                            </span>
                          ))}
                          {specs.length > 3 && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-muted">
                              +{specs.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {phone && (
                        <div className="flex gap-2 mt-3">
                          <a
                            href={`tel:${phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary hover:text-primary hover:bg-primary transition-colors border border-border"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Ligar
                          </a>
                          <a
                            href={whatsappLink(phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-success/10 text-success hover:bg-success/20 transition-colors border border-success/20"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div ref={mapRef} className="flex-1 hidden lg:block" />
      </div>

      {showDetail && selectedMechanic && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDetail(false); }}
        >
          <div className="w-full max-w-lg max-h-[90vh] bg-bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ backgroundColor: "#1c1c1f" }}>
            <div className="flex items-start justify-between p-5 border-b border-border shrink-0" style={{ backgroundColor: "#1c1c1f" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white truncate">{getName(selectedMechanic)}</h2>
                  {selectedMechanic.is_verified && <CheckCircle className="w-5 h-5 text-accent shrink-0" />}
                </div>
                <p className="text-sm text-zinc-400 mt-1">
                  {getAddress(selectedMechanic)}
                  {getDistance(selectedMechanic) ? <> \u00b7 {Number(getDistance(selectedMechanic)).toFixed(1)} km</> : null}
                </p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ backgroundColor: "#1c1c1f" }}>
              {getRating(selectedMechanic) ? (
                <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-700" style={{ backgroundColor: "#09090b" }}>
                  <div className="text-3xl font-bold text-yellow-500">{Number(getRating(selectedMechanic)).toFixed(1)}</div>
                  <div>
                    <div className="text-yellow-500 text-lg">{renderStars(getRating(selectedMechanic))}</div>
                    <p className="text-sm text-zinc-400 mt-1">{selectedMechanic.total_avaliacoes || 0} avaliacoes</p>
                  </div>
                </div>
              ) : null}

              {selectedMechanic.descricao && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Sobre</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{selectedMechanic.descricao}</p>
                </div>
              )}

              {getSpecs(selectedMechanic).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Especialidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {getSpecs(selectedMechanic).map((s) => (
                      <span key={s} className="px-3 py-1 rounded-lg text-xs font-medium text-blue-400 border border-blue-500/30" style={{ backgroundColor: "rgba(59,130,246,0.15)" }}>
                        {formatService(s)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedMechanic.servicos && selectedMechanic.servicos.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Servicos</h3>
                  <div className="rounded-xl border border-zinc-700 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-700" style={{ backgroundColor: "#09090b" }}>
                          <th className="text-left text-xs font-medium text-zinc-400 px-4 py-2">Servico</th>
                          <th className="text-right text-xs font-medium text-zinc-400 px-4 py-2">Preco</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMechanic.servicos.map((s: any, i: number) => (
                          <tr key={i} className="border-b border-zinc-700 last:border-0" style={{ backgroundColor: "#09090b" }}>
                            <td className="px-4 py-2.5 text-sm text-zinc-300">{s.nome || s}</td>
                            <td className="px-4 py-2.5 text-sm text-green-400 font-semibold text-right">
                              {s.preco ? `R$ ${Number(s.preco).toFixed(2)}` : "Sob consulta"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedMechanic.horario_funcionamento && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Horario</h3>
                  {typeof selectedMechanic.horario_funcionamento === "string" ? (
                    <p className="text-sm text-zinc-400">{selectedMechanic.horario_funcionamento}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedMechanic.horario_funcionamento).map(([dia, horario]) => (
                        <div key={dia} className="flex justify-between px-3 py-2 rounded-lg border border-zinc-700" style={{ backgroundColor: "#09090b" }}>
                          <span className="text-xs text-zinc-400 uppercase">{dia}</span>
                          <span className="text-xs text-white font-medium">{String(horario) || "Fechado"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Contato</h3>
                <div className="space-y-2">
                  {getPhone(selectedMechanic) && (
                    <div className="flex gap-2">
                      <a
                        href={`tel:${getPhone(selectedMechanic)}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
                        style={{ backgroundColor: "#09090b" }}
                      >
                        <Phone className="w-4 h-4" />
                        Ligar
                      </a>
                      <a
                        href={whatsappLink(getPhone(selectedMechanic))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-green-400 border border-green-500/30 hover:bg-green-500/10 transition-colors"
                        style={{ backgroundColor: "rgba(34,197,94,0.1)" }}
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    </div>
                  )}
                  {selectedMechanic.email && (
                    <a
                      href={`mailto:${selectedMechanic.email}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
                      style={{ backgroundColor: "#09090b" }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      {selectedMechanic.email}
                    </a>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Deixar avaliacao</h3>
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} onClick={() => setReviewRating(star)}>
                        <Star className={`w-6 h-6 transition-colors ${star <= reviewRating ? "text-yellow-500 fill-yellow-500" : "text-zinc-600"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Escreva sua avaliacao..."
                    rows={3}
                    className="w-full border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                    style={{ backgroundColor: "#09090b" }}
                  />
                  <Button onClick={() => submitReview(selectedMechanic.id)} disabled={!reviewText.trim()} className="w-full">
                    Enviar avaliacao
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}