import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Share2, DollarSign, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-books.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              BookShare
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost">Tableau de bord</Button>
                </Link>
                <Link to="/add-book">
                  <Button className="bg-gradient-hero hover:opacity-90">
                    Ajouter un livre
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/auth">
                <Button className="bg-gradient-hero hover:opacity-90">
                  Connexion
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <img 
          src={heroImage} 
          alt="Students sharing books" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
        />
        <div className="relative container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
            Partagez et vendez vos manuels scolaires
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            La plateforme camerounaise pour échanger des livres scolaires entre étudiants
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-2 bg-white rounded-xl shadow-glow p-2">
              <Input
                type="text"
                placeholder="Rechercher un livre, auteur, matière..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 text-lg"
              />
              <Button type="submit" size="lg" className="bg-gradient-hero hover:opacity-90">
                <Search className="h-5 w-5 mr-2" />
                Rechercher
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-card hover:shadow-glow transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Ajoutez vos livres</h3>
                <p className="text-muted-foreground">
                  Publiez vos manuels avec photos et détails. Choisissez de les partager gratuitement ou de les vendre.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Trouvez ce dont vous avez besoin</h3>
                <p className="text-muted-foreground">
                  Recherchez des livres par titre, matière, niveau. Filtrez par type (gratuit ou vente).
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-glow transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mb-4">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Échangez en toute sécurité</h3>
                <p className="text-muted-foreground">
                  Discutez, convenez d'un rendez-vous et échangez vos livres en personne.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Pourquoi utiliser BookShare ?
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                    <Share2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <strong>Partage gratuit</strong>
                    <p className="text-muted-foreground">Aidez d'autres étudiants en donnant vos anciens livres</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center mt-1">
                    <DollarSign className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <strong>Vendez facilement</strong>
                    <p className="text-muted-foreground">Gagnez de l'argent en vendant vos manuels dont vous n'avez plus besoin</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <strong>Système de réputation</strong>
                    <p className="text-muted-foreground">Évaluations pour des échanges en toute confiance</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-hero rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Commencez maintenant</h3>
              <p className="mb-6 text-white/90">
                Rejoignez des milliers d'étudiants camerounais qui partagent et vendent leurs livres
              </p>
              <Link to={user ? "/add-book" : "/auth"}>
                <Button size="lg" variant="secondary" className="w-full">
                  {user ? "Ajouter un livre" : "S'inscrire gratuitement"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card/50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 BookShare Cameroun. Partage et vente de manuels scolaires.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
