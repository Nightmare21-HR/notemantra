import torch
import torch.nn as nn
import torch.optim as optim
from model import NoteMantraTransformer
import json

# --- CONFIGURATION ---
DEVICE = torch.device("cpu") # Keep it simple for hackathon
VOCAB_SIZE = 5000
EMBED_SIZE = 64
NUM_HEADS = 2
NUM_LAYERS = 2
NUM_CLASSES = 4 # 0:Math, 1:Physics, 2:Chem, 3:CS
MAX_SEQ_LEN = 50

# --- DUMMY DATA ---
# In reality, you'd load a CSV here.
# We map simple keywords to classes for the demo to work "magically".
dummy_vocab = {
    "integral": 1, "derivative": 2, "matrix": 3,  # Math
    "force": 4, "velocity": 5, "gravity": 6,      # Physics
    "acid": 7, "reaction": 8, "molecule": 9,      # Chem
    "algorithm": 10, "loop": 11, "database": 12,  # CS
    "<PAD>": 0, "<UNK>": 13
}

# Save vocab for inference
with open("vocab.json", "w") as f:
    json.dump(dummy_vocab, f)

# Initialize Model
model = NoteMantraTransformer(VOCAB_SIZE, EMBED_SIZE, NUM_HEADS, NUM_LAYERS, NUM_CLASSES, MAX_SEQ_LEN, DEVICE).to(DEVICE)
optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

print("🤖 Training Custom Transformer...")

# Fake Training Loop (Just to save weights)
model.train()
for epoch in range(5):
    # Simulate a batch of data
    inputs = torch.randint(1, 14, (8, 10)).to(DEVICE) # Random words
    targets = torch.randint(0, NUM_CLASSES, (8,)).to(DEVICE) # Random labels

    optimizer.zero_grad()
    outputs = model(inputs)
    loss = criterion(outputs, targets)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1}/5 | Loss: {loss.item():.4f}")

# Save the Weights
torch.save(model.state_dict(), "subject_classifier.pth")
print("✅ Model Saved as 'subject_classifier.pth'")