import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, BookOpen } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  is_available: boolean;
  photos: string[] | null;
}

interface BookWithInstances extends Book {
  instances: BookInstance[];
}

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [books, setBooks] = useState<BookWithInstances[]>([]);
  const [loading, setLoading] = useState(false);

  const searchBooks = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("*")
        .or(`title.ilike.%${query}%,author.ilike.%${query}%,subject.ilike.%${query}%`);

      if (booksError) throw booksError;

      if (booksData && booksData.length > 0) {
        const bookIds = booksData.map(book => book.id);
        
        const { data: instancesData, error: instancesError } = await supabase
          .from("book_instances")
          .select("*")
          .in("book_id", bookIds)
          .eq("is_available", true);

        if (instancesError) throw instancesError;

        const booksWithInstances = booksData.map(book => ({
          ...book,
          instances: instancesData?.filter(instance => instance.book_id === book.id) || []
        }));

        setBooks(booksWithInstances.filter(book => book.instances.length > 0));
      } else {
        setBooks([]);
      }
    } catch (error) {
      console.error("Error searching books:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      searchBooks(query);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <a href="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
              <BookOpen className="h-8 w-8" />
              BookShare
            </a>
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Rechercher un livre par titre, auteur ou matière..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            <Button onClick={() => navigate("/dashboard")}>Mon compte</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          Résultats pour "{searchParams.get("q")}"
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Recherche en cours...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">Aucun livre trouvé</p>
            <p className="text-muted-foreground mt-2">Essayez une autre recherche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <Card key={book.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  {book.instances[0]?.photos && book.instances[0].photos.length > 0 ? (
                    <img
                      src={book.instances[0].photos[0]}
                      alt={book.title}
                      className="w-full h-48 object-cover rounded-md mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-md mb-4 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <h3 className="font-bold text-lg mb-2">{book.title}</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    Auteur: {book.author}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Matière: {book.subject} | Classe: {book.target_grade}
                  </p>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {book.instances.map((instance) => (
                      <Badge
                        key={instance.id}
                        variant={instance.transaction_type === "free" ? "secondary" : "default"}
                      >
                        {instance.transaction_type === "free" ? "Gratuit" : `${instance.sale_price} FCFA`}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/book/${book.id}`)}
                  >
                    Voir les détails
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Search;
