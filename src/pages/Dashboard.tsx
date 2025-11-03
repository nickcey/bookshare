import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, LogOut, User, Package, TrendingUp, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Fetch user's books
      const { data: booksData } = await supabase
        .from("book_instances")
        .select(`
          *,
          books (*)
        `)
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      setMyBooks(booksData || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

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
            <Link to="/messages">
              <Button variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                Messages
              </Button>
            </Link>
            <Link to="/add-book">
              <Button className="bg-gradient-hero hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un livre
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Profile Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-hero rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{profile?.full_name || "Utilisateur"}</h1>
              <p className="text-muted-foreground">
                {profile?.education_level && profile?.grade
                  ? `${profile.education_level} - ${profile.grade}`
                  : "Profil incomplet"}
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Livres partagés</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.total_shared || 0}</div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Livres vendus</CardTitle>
                <TrendingUp className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profile?.total_sold || 0}</div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Réputation</CardTitle>
                <span className="text-2xl">⭐</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile?.reputation_score ? Number(profile.reputation_score).toFixed(1) : "0.0"}/5.0
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="my-books" className="w-full">
          <TabsList>
            <TabsTrigger value="my-books">Mes livres ({myBooks.length})</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="my-books" className="mt-6">
            {myBooks.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Aucun livre pour le moment</h3>
                  <p className="text-muted-foreground mb-4">
                    Commencez par ajouter vos premiers livres à partager ou vendre
                  </p>
                  <Link to="/add-book">
                    <Button className="bg-gradient-hero hover:opacity-90">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un livre
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBooks.map((bookInstance) => (
                  <Card key={bookInstance.id} className="shadow-card hover:shadow-glow transition-shadow">
                    <CardContent className="pt-6">
                      {bookInstance.photos && bookInstance.photos.length > 0 ? (
                        <img
                          src={bookInstance.photos[0]}
                          alt={bookInstance.books.title}
                          className="w-full h-48 object-cover rounded-md mb-4"
                        />
                      ) : (
                        <div className="w-full h-48 bg-muted rounded-md mb-4 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant={bookInstance.transaction_type === "gratuit" ? "secondary" : "default"}>
                          {bookInstance.transaction_type === "gratuit" ? "GRATUIT" : `${bookInstance.sale_price} FCFA`}
                        </Badge>
                        <Badge variant={bookInstance.is_available ? "default" : "secondary"}>
                          {bookInstance.is_available ? "Disponible" : "Non disponible"}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{bookInstance.books?.title}</h3>
                      <p className="text-sm text-muted-foreground mb-1">
                        Par {bookInstance.books?.author}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {bookInstance.books?.subject} - {bookInstance.books?.education_level}
                      </p>
                      <div className="flex items-center gap-2 text-sm mb-4">
                        <Badge variant="outline">{bookInstance.condition}</Badge>
                        <span className="text-muted-foreground">
                          {bookInstance.city}, {bookInstance.neighborhood}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-gradient-hero hover:opacity-90"
                          onClick={async () => {
                            if (confirm(`Confirmer que ce livre a été ${bookInstance.transaction_type === "gratuit" ? "partagé" : "vendu"} ?`)) {
                              try {
                                // Create a transaction record
                                const { error: transactionError } = await supabase
                                  .from("transactions")
                                  .insert({
                                    owner_id: user.id,
                                    instance_id: bookInstance.id,
                                    requester_id: user.id,
                                    transaction_type: bookInstance.transaction_type,
                                    status: "completed",
                                    amount: bookInstance.sale_price,
                                  });

                                if (transactionError) throw transactionError;

                                // Update profile stats
                                const updateField = bookInstance.transaction_type === "gratuit" ? "total_shared" : "total_sold";
                                const currentValue = profile?.[updateField] || 0;
                                
                                const { error: profileError } = await supabase
                                  .from("profiles")
                                  .update({ [updateField]: currentValue + 1 })
                                  .eq("id", user.id);

                                if (profileError) throw profileError;

                                // Delete the book instance
                                const { error: deleteError } = await supabase
                                  .from("book_instances")
                                  .delete()
                                  .eq("id", bookInstance.id);

                                if (deleteError) throw deleteError;

                                toast.success(`Livre ${bookInstance.transaction_type === "gratuit" ? "partagé" : "vendu"} avec succès !`);
                                checkUser();
                              } catch (error: any) {
                                toast.error("Erreur lors de l'opération");
                              }
                            }
                          }}
                        >
                          Partagé/Vendu
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            if (confirm("Êtes-vous sûr de vouloir supprimer ce livre ?")) {
                              const { error } = await supabase
                                .from("book_instances")
                                .delete()
                                .eq("id", bookInstance.id);
                              
                              if (error) {
                                toast.error("Erreur lors de la suppression");
                              } else {
                                toast.success("Livre supprimé avec succès");
                                checkUser();
                              }
                            }
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Les transactions seront affichées ici une fois que vous commencerez à échanger des livres
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
