import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MapPin, Package, User, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: string;
  title: string;
  author: string;
  subject: string;
  education_level: string;
  target_grade: string;
  cover_photo: string | null;
  description: string | null;
}

interface BookInstance {
  id: string;
  transaction_type: string;
  condition: string;
  sale_price: number | null;
  city: string;
  neighborhood: string;
  photos: string[] | null;
  owner_id: string;
}

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  school: string | null;
}

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [book, setBook] = useState<Book | null>(null);
  const [instances, setInstances] = useState<BookInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<BookInstance | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const { data: bookData, error: bookError } = await supabase
          .from("books")
          .select("*")
          .eq("id", id)
          .single();

        if (bookError) throw bookError;
        setBook(bookData);

        const { data: instancesData, error: instancesError } = await supabase
          .from("book_instances")
          .select("*")
          .eq("book_id", id)
          .eq("is_available", true);

        if (instancesError) throw instancesError;
        setInstances(instancesData || []);
        
        if (instancesData && instancesData.length > 0) {
          setSelectedInstance(instancesData[0]);
          
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", instancesData[0].owner_id)
            .single();

          if (profileError) throw profileError;
          setOwner(profileData);
        }
      } catch (error) {
        console.error("Error fetching book details:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails du livre",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchBookDetails();
    }
  }, [id, toast]);

  const handleInstanceSelect = async (instance: BookInstance) => {
    setSelectedInstance(instance);
    
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", instance.owner_id)
      .single();

    if (!profileError && profileData) {
      setOwner(profileData);
    }
  };

  const handleContactOwner = () => {
    if (!currentUser) {
      toast({
        title: "Connexion requise",
        description: "Vous devez vous connecter pour contacter le propriétaire",
      });
      navigate("/auth");
      return;
    }

    if (selectedInstance) {
      navigate(`/chat/${selectedInstance.owner_id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground">Livre non trouvé</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
              <BookOpen className="h-8 w-8" />
              BookShare
            </a>
            <Button onClick={() => navigate("/dashboard")}>Mon compte</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            {selectedInstance?.photos && selectedInstance.photos.length > 0 ? (
              <img
                src={selectedInstance.photos[0]}
                alt={book.title}
                className="w-full rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                <BookOpen className="h-24 w-24 text-muted-foreground" />
              </div>
            )}

            {selectedInstance?.photos && selectedInstance.photos.length > 1 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {selectedInstance.photos.slice(1).map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Photo ${index + 2}`}
                    className="w-full h-24 object-cover rounded-md"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{book.title}</h1>
              <p className="text-xl text-muted-foreground mb-4">par {book.author}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge>{book.subject}</Badge>
                <Badge variant="outline">{book.education_level}</Badge>
                <Badge variant="outline">Classe: {book.target_grade}</Badge>
              </div>
            </div>

            {book.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{book.description}</p>
                </CardContent>
              </Card>
            )}

            {instances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Exemplaires disponibles ({instances.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {instances.map((instance) => (
                    <div
                      key={instance.id}
                      onClick={() => handleInstanceSelect(instance)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedInstance?.id === instance.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={instance.transaction_type === "free" ? "secondary" : "default"}>
                          {instance.transaction_type === "free" ? "Gratuit" : `${instance.sale_price} FCFA`}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Package className="h-4 w-4" />
                          {instance.condition}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {instance.neighborhood}, {instance.city}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {selectedInstance && owner && (
              <Card>
                <CardHeader>
                  <CardTitle>Propriétaire</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{owner.full_name}</span>
                  </div>
                  {owner.school && (
                    <p className="text-sm text-muted-foreground mb-4">École: {owner.school}</p>
                  )}
                  <Button onClick={handleContactOwner} className="w-full">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Contacter le propriétaire
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookDetails;
