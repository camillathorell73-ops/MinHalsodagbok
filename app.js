// URL:en som pekar på din Netlify Function.
// Denna fungerar automatiskt när sidan körs från Netlify.
const API_URL = '/.netlify/functions/api';

// Körs när hela HTML-sidan har laddats in i webbläsaren.
document.addEventListener('DOMContentLoaded', () => {
    // Koppla "submit"-händelsen i formuläret till vår sparaData-funktion.
    document.getElementById('healthForm').addEventListener('submit', sparaData);
    
    // Hämta all befintlig data och rita diagrammet direkt när sidan laddas.
    visaData();
});

/**
 * Samlar in data från formuläret och skickar den till databasen (via Netlify Function).
 * @param {Event} event - Submit-händelsen från formuläret.
 */
async function sparaData(event) {
    // Förhindra att webbläsaren laddar om sidan, vilket är standard för formulär.
    event.preventDefault();
    
    // Skapa ett dataobjekt från värdena i formuläret.
    const nyPost = {
        datum: new Date().toISOString().split('T')[0], // Dagens datum i formatet YYYY-MM-DD
        smarta: parseInt(document.getElementById('smarta').value),
        tabletter: parseInt(document.getElementById('tabletter').value),
        ovningar: document.querySelector('input[name="ovningar"]:checked').value,
        frisk: document.querySelector('input[name="frisk"]:checked').value,
        vader: document.getElementById('vader').value,
        gjort: document.getElementById('gjort').value,
        anteckningar: document.getElementById('anteckningar').value,
    };

    // Skicka datan till vår backend (Netlify Function) med metoden POST.
    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nyPost), // Gör om vårt objekt till en JSON-sträng
        });

        document.getElementById('healthForm').reset(); // Töm formuläret
        visaData(); // Ladda om datan för att se den nya posten i diagrammet
        alert('Dina svar har sparats i ditt Google Sheet!');

    } catch (error) {
        console.error('Kunde inte spara data:', error);
        alert('Något gick fel vid sparandet. Kontrollera konsolen för mer information.');
    }
}

/**
 * Hämtar all data från databasen (via Netlify Function) och anropar funktionen som ritar diagrammet.
 */
async function visaData() {
    // Hämta all data från vår backend (Netlify Function) med metoden GET.
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Sortera datan efter datum i stigande ordning.
        data.sort((a, b) => new Date(a.datum) - new Date(b.datum));

        // Skicka den hämtade och sorterade datan till funktionen som ritar diagrammet.
        ritaDiagram(data);
        
    } catch (error) {
        console.error('Kunde inte hämta data:', error);
        alert('Kunde inte ladda historiken från databasen.');
    }
}

/**
 * Ritar diagrammet på webbsidan med hjälp av Chart.js.
 * @param {Array} data - En lista med alla datapunkter från databasen.
 */
function ritaDiagram(data) {
    const ctx = document.getElementById('healthChart').getContext('2d');
    
    // Om ett diagram redan finns, förstör det innan vi ritar ett nytt.
    // Detta förhindrar att diagram ritas ovanpå varandra.
    if (window.myHealthChart) {
        window.myHealthChart.destroy();
    }

    // Skapa en ny instans av Chart och spara den globalt för att kunna förstöra den senare.
    window.myHealthChart = new Chart(ctx, {
        type: 'line', // Linjediagram passar bra för att se trender över tid.
        data: {
            labels: data.map(post => post.datum), // Alla datum på X-axeln
            datasets: [
                {
                    label: 'Smärta (1-5)',
                    data: data.map(post => post.smarta),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    yAxisID: 'y-axis-main', // Koppla till den vänstra Y-axeln.
                },
                {
                    label: 'Tabletter (0-2)',
                    data: data.map(post => post.tabletter),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: false,
                    yAxisID: 'y-axis-main', // Koppla också till den vänstra Y-axeln.
                },
                {
                    label: 'Gjort övningar (Ja=1, Nej=0)',
                    // Omvandla texten "ja" till siffran 1, och allt annat till 0.
                    data: data.map(post => post.ovningar === 'ja' ? 1 : 0),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    stepped: true, // Gör linjen "hackig" som en trappa, passar bra för Ja/Nej.
                    yAxisID: 'y-axis-secondary', // Koppla till den högra Y-axeln.
                },
                 {
                    label: 'Känner mig frisk (Ja=1, Nej=0)',
                    data: data.map(post => post.frisk === 'ja' ? 1 : 0),
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    stepped: true,
                    yAxisID: 'y-axis-secondary', // Koppla också till den högra Y-axeln.
                }
            ]
        },
        options: {
            responsive: true, // Gör diagrammet responsivt.
            interaction: {
                mode: 'index', // Visa info för alla dataset på samma datum när man hovrar.
                intersect: false,
            },
            scales: {
                // Konfiguration för den vänstra Y-axeln (för smärta och tabletter).
                'y-axis-main': {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: 5, // Sätt skalan från 0 till 5.
                    title: {
                        display: true,
                        text: 'Skala Smärta / Tabletter'
                    }
                },
                // Konfiguration för den högra Y-axeln (för Ja/Nej-frågor).
                'y-axis-secondary': {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 1, // Skalan är bara 0 (Nej) och 1 (Ja).
                    ticks: {
                        stepSize: 1 // Tvinga fram att bara visa 0 och 1 på skalan.
                    },
                    grid: {
                        drawOnChartArea: false, // Rita inte rutnät för denna axel för tydlighet.
                    },
                    title: {
                        display: true,
                        text: 'Ja / Nej'
                    }
                }
            },
            plugins: {
                tooltip: {
                    // Anpassa rutan som visas när man hovrar över en datapunkt.
                    callbacks: {
                        footer: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            const post = data[index];
                            let footerText = '\n'; // Börja med en ny rad för luftighet.
                            
                            // Lägg till fritextsvaren till hover-rutan.
                            if (post.vader) footerText += `Väder: ${post.vader}\n`;
                            if (post.gjort) footerText += `Gjort: ${post.gjort}\n`;
                            if (post.anteckningar) footerText += `Anteckningar: ${post.anteckningar}\n`;
                            
                            return footerText.trim(); // Ta bort sista radbrytningen.
                        }
                    }
                }
            }
        }
    });
}
