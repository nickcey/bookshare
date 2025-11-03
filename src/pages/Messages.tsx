import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(user);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchConversations = async () => {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les conversations",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();

      for (const message of messages || []) {
        const otherUserId = message.sender_id === currentUser.id 
          ? message.receiver_id 
          : message.sender_id;

        if (!conversationMap.has(otherUserId)) {
          // Fetch other user's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", otherUserId)
            .single();

          const unreadCount = messages.filter(
            m => m.receiver_id === currentUser.id && 
                 m.sender_id === otherUserId && 
                 !m.is_read
          ).length;

          conversationMap.set(otherUserId, {
            userId: otherUserId,
            userName: profile?.full_name || "Utilisateur inconnu",
            lastMessage: message.content,
            lastMessageTime: message.created_at,
            unreadCount,
          });
        }
      }

      setConversations(Array.from(conversationMap.values()));
      setLoading(false);
    };

    fetchConversations();
  }, [currentUser, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="font-bold text-xl">Mes conversations</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {conversations.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Aucune conversation pour le moment</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <Card
                key={conversation.userId}
                className="p-4 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => navigate(`/chat/${conversation.userId}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{conversation.userName}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {conversation.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(conversation.lastMessageTime).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
