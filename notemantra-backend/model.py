import torch
import torch.nn as nn
import math

class NoteMantraTransformer(nn.Module):
    def __init__(self, vocab_size, embed_size, num_heads, num_layers, num_classes, max_seq_len, device):
        super(NoteMantraTransformer, self).__init__()
        self.device = device
        self.embed_size = embed_size
        
        # 1. Embeddings
        self.embedding = nn.Embedding(vocab_size, embed_size)
        self.positional_encoding = self._generate_positional_encoding(max_seq_len, embed_size)
        
        # 2. Transformer Encoder Layers (The Core)
        encoder_layer = nn.TransformerEncoderLayer(d_model=embed_size, nhead=num_heads, batch_first=True)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        
        # 3. Classifier Head (To predict Math/Physics/etc)
        self.fc_out = nn.Linear(embed_size, num_classes)
        self.dropout = nn.Dropout(0.1)

    def _generate_positional_encoding(self, max_len, d_model):
        # Standard Sinusoidal Positional Encoding
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        return pe.unsqueeze(0) # Batch dimension

    def forward(self, x):
        # x shape: (Batch_Size, Seq_Len)
        seq_len = x.size(1)
        
        # Add Position info to Word Embeddings
        x = self.embedding(x) + self.positional_encoding[:, :seq_len, :].to(self.device)
        x = self.dropout(x)
        
        # Pass through Transformer
        x = self.transformer_encoder(x)
        
        # Average Pooling (Summarize sentence into one vector)
        x = x.mean(dim=1)
        
        # Predict Class
        out = self.fc_out(x)
        return out