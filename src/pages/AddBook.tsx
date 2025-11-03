import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";

const AddBook = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Book details
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subject, setSubject] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [targetGrade, setTargetGrade] = useState("");
  const [description, setDescription] = useState("");
  
  // Instance details
  const [condition, setCondition] = useState("");
  const [transactionType, setTransactionType] = useState("gratuit");
  const [salePrice, setSalePrice] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 3);
      setPhotos(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First, create or find the book
      const { data: existingBook } = await supabase
        .from("books")
        .select("id")
        .eq("title", title)
        .eq("author", author)
        .maybeSingle();

      let bookId = existingBook?.id;

      if (!bookId) {
        const { data: newBook, error: bookError } = await supabase
          .from("books")
          .insert({
            title,
            author,
            subject,
            education_level: educationLevel,
            target_grade: targetGrade,
            description,
          })
          .select()
          .single();

        if (bookError) throw bookError;
        bookId = newBook.id;
      }

      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('book-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('book-photos')
          .getPublicUrl(fileName);

        photoUrls.push(publicUrl);
      }

      // Create book instance
      const { error: instanceError } = await supabase
        .from("book_instances")
        .insert({
          book_id: bookId,
          owner_id: user.id,
          condition,
          transaction_type: transactionType,
          sale_price: transactionType === "vente" ? parseFloat(salePrice) : null,
          city,
          neighborhood,
          photos: photoUrls,
        });

      if (instanceError) throw instanceError;

      toast.success("Livre ajouté avec succès !");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout du livre");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
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
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au tableau de bord
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">Ajouter un livre</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Book Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informations du livre</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Mathématiques Terminale C"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Auteur *</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Matière *</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Mathématiques"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="education-level">Niveau d'éducation *</Label>
                    <Select value={educationLevel} onValueChange={setEducationLevel} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir le niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primaire">Primaire</SelectItem>
                        <SelectItem value="college">Collège</SelectItem>
                        <SelectItem value="lycee">Lycée</SelectItem>
                        <SelectItem value="universite">Université</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-grade">Classe ciblée</Label>
                  <Input
                    id="target-grade"
                    value={targetGrade}
                    onChange={(e) => setTargetGrade(e.target.value)}
                    placeholder="Ex: Terminale C, Licence 2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ajoutez des détails supplémentaires..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Book Condition & Transaction */}
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Détails de votre exemplaire</h3>

                <div className="space-y-2">
                  <Label>État du livre *</Label>
                  <Select value={condition} onValueChange={setCondition} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner l'état" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neuf">Neuf</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="bon">Bon</SelectItem>
                      <SelectItem value="acceptable">Acceptable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type de transaction *</Label>
                  <RadioGroup value={transactionType} onValueChange={setTransactionType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="gratuit" id="gratuit" />
                      <Label htmlFor="gratuit" className="font-normal cursor-pointer">
                        Partage gratuit
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="vente" id="vente" />
                      <Label htmlFor="vente" className="font-normal cursor-pointer">
                        Vente
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {transactionType === "vente" && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix de vente (FCFA) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="Ex: 5000"
                      required={transactionType === "vente"}
                    />
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Yaoundé"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Quartier *</Label>
                    <Input
                      id="neighborhood"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Ngoa-Ekelle"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photos">Photos (max 3)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="photos"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="cursor-pointer"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {photos.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {photos.length} photo(s) sélectionnée(s)
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-hero hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? "Ajout en cours..." : "Publier le livre"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddBook;
