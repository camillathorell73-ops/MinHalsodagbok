// URL:en som pekar på din Netlify Function.
const API_URL = '/.netlify/functions/api';

// Globala variabler för att hålla all data och den nuvarande filterinställningen
let allHealthData = [];
let currentFilterDays = 14; // Default: visa 14 dagar

// Körs när hela HTML-sidan har laddats
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('healthForm').addEventListener('submit', sparaData);
    
    // Sätt upp event listeners för de nya filterknapparna
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Ta bort 'active' klassen från alla knappar
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Lägg till 'active' på den klickade knappen
            button.classList.add('active');
            
            currentFilterDays = parseInt(button.getAttribute('data-days'));
            updateChart(); // Rita om diagrammet med det nya filtret
        });
    });

    // Hämta all data från databasen när sidan laddas
    fetchAndDisplayInitialData();
});

/**
 * Hämtar all data från API:et och lagrar den lokalt.
 */
async function fetchAndDisplayInitialData() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        // Sortera all data efter datum direkt när den hämtas
        allHealthData = data.sort((a, b) => new Date(a.datum) - new Date(b.datum));
        
        updateChart(); // Visa diagrammet med default-filtret
    } catch (error) {
        console.error('Kunde inte hämta data:', error);
        ritaDiagram([]); // Rita ett tomt diagram om något går fel
    }
}

/**
 * Sparar ny data och uppdaterar sedan diagrammet.
 */
async function sparaData(event) {
    event.preventDefault();
    const nyPost = {
        datum: new Date().toISOString().split('T')[0],
        smarta: parseInt(document.getElementById('smarta').value),
        tabletter: parseInt(document.getElementById('tabletter').value),
        ovningar: document.querySelector('input[name="ovningar"]:checked').value,
        frisk: document.querySelector('input[name="frisk"]:checked').value,
        vader: document.getElementById('vader').value,
        gjort: document.getElementById('gjort').value,
        anteckningar: document.getElementById('anteckningar').value,
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nyPost),
        });

        document.getElementById('healthForm').reset();
        alert('Dina svar har sparats i ditt Google Sheet!');
        // Hämta all data på nytt för att inkludera den nya posten
        fetchAndDisplayInitialData(); 
    } catch (error) {
        console.error('Kunde inte spara data:', error);
        alert('Något gick fel vid sparandet.');
    }
}

/**
 * Filtrerar den lagrade datan och anropar funktionen som ritar diagrammet.
 */
function updateChart() {
    let filteredData = allHealthData;

    if (currentFilterDays > 0 && allHealthData.length > 0) {
        // Skapa ett slutdatum (idag)
        const endDate = new Date();
        // Skapa ett startdatum baserat på filtret
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - currentFilterDays);

        // Använd filter-funktionen för att bara få med relevant data
        filteredData = allHealthData.filter(post => {
            const postDate = new Date(post.datum);
            return postDate >= startDate && postDate <= endDate;
        });
    }
    
    ritaDiagram(filteredData);
}


/**
 * Ritar det nya, förbättrade diagrammet på webbsidan.
 * @param {Array} data - En lista med datapunkter som ska visas.
 */
function ritaDiagram(data) {
    const ctx = document.getElementById('healthChart').getContext('2d');
    
    if (window.myHealthChart) {
        window.myHealthChart.destroy();
    }

    window.myHealthChart = new Chart(ctx, {
        type: 'bar', // Sätt grundtypen till 'bar' för bakgrundsfälten
        data: {
            labels: data.map(post => new Date(post.datum).toLocaleDateString('sv-SE', {day: 'numeric', month: 'short'})),
            datasets: [
                // DATASET 1: Bakgrundsstapel för "Gjort övningar"
                {
                    type: 'bar',
                    label: 'Gjort övningar',
                    data: data.map(post => post.ovningar === 'ja' ? 5 : 0), // Stapelns höjd (matchar Y-axelns max)
                    backgroundColor: 'rgba(144, 238, 144, 0.3)', // Ljusgrön, halvtransparent
                    borderColor: 'rgba(144, 238, 144, 0.3)',
                    borderWidth: 1,
                    barPercentage: 1.0,
                    categoryPercentage: 1.0,
                    order: 3, // Se till att den ritas bakom linjerna
                    yAxisID: 'y-axis-main',
                },
                // DATASET 2: Linje för "Smärta"
                {
                    type: 'line', // Överskrid grundtypen
                    label: 'Smärta (1-5)',
                    data: data.map(post => post.smarta),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    tension: 0.1, // Gör linjen lite mjukare
                    order: 1, // Ritas överst
                    yAxisID: 'y-axis-main',
                },
                // DATASET 3: Linje för "Tabletter"
                {
                    type: 'line',
                    label: 'Tabletter (0-2)',
                    data: data.map(post => post.tabletter),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    tension: 0.1,
                    order: 2,
                    yAxisID: 'y-axis-main',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    stacked: true, // Viktigt för att staplar och linjer ska hamna rätt
                },
                'y-axis-main': {
                    stacked: false,
                    beginAtZero: true,
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    },
                    title: {
                        display: true,
                        text: 'Skala Smärta / Tabletter'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        footer: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            const post = data[index];
                            let footerText = '\n';
                            
                            // Tydligare text i mouse-over
                            const ovningarText = post.ovningar === 'ja' ? 'Ja' : 'Nej';
                            const friskText = post.frisk === 'ja' ? 'Ja' : 'Nej';

                            footerText += `Övningar gjorda: ${ovningarText}\n`;
                            footerText += `Kände mig frisk: ${friskText}\n\n`;

                            if (post.vader) footerText += `Väder: ${post.vader}\n`;
                            if (post.gjort) footerText += `Gjort: ${post.gjort}\n`;
                            if (post.anteckningar) footerText += `Anteckningar: ${post.anteckningar}\n`;
                            
                            return footerText.trim();
                        }
                    }
                }
            }
        }
    });
}
